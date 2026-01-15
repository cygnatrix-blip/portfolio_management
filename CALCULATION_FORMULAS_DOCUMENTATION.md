# Portfolio Management System - Calculation Formulas & Logic Documentation

**Date:** November 20, 2025  
**Version:** 1.0  
**System:** Portfolio Management Application

---

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [NAV Calculation System](#nav-calculation-system)
3. [Portfolio Value Calculation](#portfolio-value-calculation)
4. [Holdings & Asset Pricing](#holdings--asset-pricing)
5. [Performance Metrics](#performance-metrics)
6. [Transaction Processing](#transaction-processing)
7. [Performance Comparison (vs Indices)](#performance-comparison-vs-indices)
8. [Frontend Calculations](#frontend-calculations)
9. [Potential Issues & Edge Cases](#potential-issues--edge-cases)

---

## 1. Core Concepts

### 1.1 Unit-Based System
The system uses a **unit-based** approach similar to mutual funds:
- Investors deposit money and receive **units** at the current NAV
- Units are redeemed when withdrawing money
- NAV (Net Asset Value) represents the price per unit

### 1.2 Key Database Tables
- **`portfolios`**: Portfolio metadata (id, name, user_id)
- **`units_ledger`**: All DEPOSIT/WITHDRAWAL transactions with units allocated
- **`asset_transactions`**: All BUY/SELL stock/MF transactions
- **`master_holdings`**: Current quantity of each asset (including CASH)
- **`nav_history`**: Daily NAV snapshots for each portfolio
- **`daily_prices`**: Market prices for stocks and mutual funds
- **`index_history`**: Nifty 50 and Nifty 500 daily prices

---

## 2. NAV Calculation System

### 2.1 Initial NAV
```
Initial NAV = 10.00 (constant)
```
- When a portfolio is created, the starting NAV is fixed at ₹10.00
- First deposit uses this NAV to calculate units

### 2.2 Daily NAV Calculation Formula

**Formula:**
```
NAV = Total Portfolio Value / Total Units Outstanding

Where:
- Total Portfolio Value = Sum of all asset values (stocks + mutual funds + cash)
- Total Units Outstanding = Net units from units_ledger (DEPOSITS - WITHDRAWALS)
```

**Implementation Location:** `server/services/eodUpdateService.js` - `recalculateAllPortfolioNavs()`

**Code Logic:**
```javascript
// Step 1: Calculate Total Portfolio Value
totalPortfolioValue = 0
for each holding in master_holdings:
    if holding.ticker == 'CASH':
        value = holding.quantity
    else:
        latestPrice = get latest price from daily_prices where ticker = holding.ticker
        value = holding.quantity × latestPrice
    totalPortfolioValue += value

// Step 2: Get Total Units Outstanding
totalUnits = SELECT SUM(units) FROM units_ledger WHERE portfolio_id = X

// Step 3: Calculate NAV
if totalUnits > 0:
    NAV = totalPortfolioValue / totalUnits
else:
    NAV = 10.00 (default)

// Step 4: Store in nav_history
INSERT INTO nav_history (portfolio_id, nav_date, nav_value, total_portfolio_value, total_units_outstanding)
```

### 2.3 Average NAV (Cost Basis)

**Formula:**
```
Average NAV = Total Investment / Total Units Outstanding

Where:
- Total Investment = Net deposits (DEPOSITS - WITHDRAWALS)
- Total Units Outstanding = Net units allocated
```

**Implementation:** `server/controllers/dashboardController.js` - `getPortfolioDashboard()`

```javascript
totalInvestment = SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount 
                          WHEN transaction_type = 'WITHDRAWAL' THEN -amount END)
                  FROM units_ledger

totalUnits = SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN units 
                     WHEN transaction_type = 'WITHDRAWAL' THEN -units END)
             FROM units_ledger

avgNav = totalInvestment / totalUnits
```

---

## 3. Portfolio Value Calculation

### 3.1 Real-Time Portfolio Valuation

**Location:** `server/controllers/transactionController.js` - `recalculatePortfolioValue()`

**Formula:**
```
Total Portfolio Value = Σ(Asset Value for each holding)

For each holding:
    if ticker == 'CASH':
        value = quantity
    else:
        currentPrice = smartPriceLogic(ticker, portfolioId)
        value = quantity × currentPrice
```

### 3.2 Smart Price Logic (Critical!)

**Purpose:** Ensures most accurate price, especially on transaction day before EOD update

**Logic Flow:**
```javascript
// A. Get latest EOD price from daily_prices
dbPrice = SELECT closing_price, price_date FROM daily_prices 
          WHERE ticker = X ORDER BY price_date DESC LIMIT 1

// B. Get latest transaction price for this asset
txPrice = SELECT price_per_share, transaction_date FROM asset_transactions
          WHERE portfolio_id = Y AND ticker = X 
          ORDER BY transaction_date DESC LIMIT 1

// C. Compare dates and choose
if dbDate >= txDate AND dbPrice > 0:
    finalPrice = dbPrice          // Use official EOD price (preferred)
else if txPrice > 0:
    finalPrice = txPrice          // Use transaction price (newer data)
else:
    finalPrice = dbPrice          // Fallback to DB price

value = quantity × finalPrice
```

**Why This Matters:**
- On the day of a transaction (before EOD update), the transaction price is more accurate
- After EOD update runs, official closing price takes precedence
- Prevents stale pricing when EOD data isn't available yet

### 3.3 Ticker Normalization (.NS Suffix Handling)

**Issue:** Some tickers stored with `.NS` suffix (NSE stocks), but `daily_prices` stores without suffix

**Solution:**
```javascript
cleanTicker = ticker.replace('.NS', '')
// Then use cleanTicker to query daily_prices
```

**Locations:**
- `transactionController.js` - `recalculatePortfolioValue()`
- `eodUpdateService.js` - `recalculateAllPortfolioNavs()`
- `dashboardController.js` - `getPortfolioDashboard()`

---

## 4. Holdings & Asset Pricing

### 4.1 Average Purchase Price (Per Asset)

**Formula:**
```
Average Purchase Price = Σ(quantity × price_per_share) / Σ(quantity)
                        FOR ALL BUY TRANSACTIONS ONLY

```

**SQL Implementation:**
```sql
SELECT SUM(quantity * price_per_share) / NULLIF(SUM(quantity), 0) AS avg_price
FROM asset_transactions
WHERE portfolio_id = X 
  AND ticker = Y 
  AND transaction_type = 'BUY'
```

**Important:** Only BUY transactions are included (SELL transactions don't affect cost basis)

**Location:** `server/controllers/dashboardController.js` - `getPortfolioDashboard()`

### 4.2 Current Price Determination

**For Stocks:**
```javascript
cleanTicker = ticker.replace('.NS', '')

// Priority 1: Latest EOD price from daily_prices
dbPrice = SELECT closing_price FROM daily_prices 
          WHERE ticker = cleanTicker 
          ORDER BY price_date DESC LIMIT 1

// Priority 2: Latest transaction price (if newer)
txPrice = SELECT price_per_share FROM asset_transactions
          WHERE portfolio_id = X AND ticker = Y
          ORDER BY transaction_date DESC LIMIT 1

// Use smart comparison logic (see 3.2)
currentPrice = smartPriceLogic(dbPrice, txPrice, dates)
```

**For Mutual Funds (numeric ticker):**
```javascript
currentPrice = SELECT closing_price FROM daily_prices
               WHERE ticker = schemeCode
               AND price_date <= today
               ORDER BY price_date DESC LIMIT 1
```

**For CASH:**
```
currentPrice = 0 (not applicable)
value = quantity (1:1)
```

### 4.3 Investment Value (Per Asset)

**Formula:**
```
Investment Value = Average Purchase Price × Current Quantity
```

**Example:**
```
Buy 1010 shares @ ₹9.00 = ₹9,090
Buy 100 shares @ ₹10.00 = ₹1,000
Sell 200 shares @ ₹10.68 = ₹2,136

Average Purchase Price = (1010×9 + 100×10) / (1010+100) = ₹10,090 / 1,110 = ₹9.09
Current Quantity = 1010 + 100 - 200 = 910 shares
Investment Value = ₹9.09 × 910 = ₹8,271.90
```

**Location:** `server/controllers/dashboardController.js` - computed in holdings loop

### 4.4 Gain/Loss Percentage (Per Asset)

**Formula:**
```
Gain/Loss % = ((Current Price - Average Purchase Price) / Average Purchase Price) × 100
```

**Example:**
```
Average Purchase Price = ₹9.09
Current Price = ₹10.00
Gain/Loss % = ((10.00 - 9.09) / 9.09) × 100 = 10.01%
```

**Edge Cases:**
- If avgPurchasePrice = 0 → Gain/Loss % = 0
- If currentPrice = 0 → Gain/Loss % = 0
- For CASH → Gain/Loss % = 0 (always)

### 4.5 Allocation Percentage

**Formula:**
```
Allocation % = (Asset Value / Total Portfolio Value) × 100
```

**Example:**
```
Asset Value = ₹9,100
Total Portfolio Value = ₹1,000,000
Allocation % = (9,100 / 1,000,000) × 100 = 0.91%
```

---

## 5. Performance Metrics

### 5.1 Absolute Gain/Loss (Portfolio Level)

**Formula:**
```
Absolute Gain/Loss = Current Portfolio Value - Total Investment
```

**Implementation:**
```javascript
totalPortfolioValue = latest nav_history.total_portfolio_value
totalInvestment = SUM(CASE WHEN type='DEPOSIT' THEN amount ELSE -amount END) 
                  FROM units_ledger

absoluteGain = totalPortfolioValue - totalInvestment
```

### 5.2 Gain/Loss Percentage (Portfolio Level)

**Formula:**
```
Gain % = (Absolute Gain / Total Investment) × 100
```

**Example:**
```
Total Portfolio Value = ₹120,000
Total Investment = ₹100,000
Absolute Gain = ₹20,000
Gain % = (20,000 / 100,000) × 100 = 20%
```

### 5.3 Overall Dashboard Aggregation

**For Multiple Portfolios:**
```javascript
// Sum across all portfolios
overallTotalValue = Σ(portfolio.currentValue)
overallTotalInvestment = Σ(portfolio.totalInvestment)
overallTotalUnits = Σ(portfolio.totalUnits)

// Calculate overall metrics
overallAbsoluteGain = overallTotalValue - overallTotalInvestment
overallGainPercentage = (overallAbsoluteGain / overallTotalInvestment) × 100
overallAvgNav = overallTotalInvestment / overallTotalUnits
overallCurrentNav = overallTotalValue / overallTotalUnits
```

**Location:** `server/controllers/dashboardController.js` - `getOverallDashboard()`

---

## 6. Transaction Processing

### 6.1 DEPOSIT Transaction

**Formula:**
```
Units Allocated = Deposit Amount / Current NAV
```

**Process:**
```javascript
1. Get latest NAV
   latestNAV = SELECT nav_value FROM nav_history 
               WHERE portfolio_id = X 
               ORDER BY nav_date DESC LIMIT 1
   
   If no NAV exists: latestNAV = 10.00

2. Calculate units
   newUnits = depositAmount / latestNAV

3. Insert into units_ledger
   INSERT INTO units_ledger (transaction_type, amount, units)
   VALUES ('DEPOSIT', depositAmount, newUnits)

4. Add cash to holdings
   UPDATE master_holdings SET quantity = quantity + depositAmount
   WHERE ticker = 'CASH'

5. Recalculate NAV (live)
```

**Example:**
```
Deposit: ₹10,000
Current NAV: ₹12.50
Units = 10,000 / 12.50 = 800 units
```

### 6.2 WITHDRAWAL Transaction

**Formula:**
```
Units Redeemed = Withdrawal Amount / Current NAV
```

**Validation:**
```javascript
1. Check sufficient units
   totalUnits = SUM(units) FROM units_ledger WHERE type = 'DEPOSIT'
              - SUM(units) FROM units_ledger WHERE type = 'WITHDRAWAL'
   
   If unitsToRedeem > totalUnits → ERROR

2. Check sufficient cash
   cashBalance = SELECT quantity FROM master_holdings WHERE ticker = 'CASH'
   
   If withdrawalAmount > cashBalance → ERROR

3. Process withdrawal (similar to deposit, negative units)
```

### 6.3 BUY Transaction

**Process:**
```javascript
1. Calculate total cost
   totalCost = quantity × price_per_share

2. Check sufficient cash
   cashBalance = SELECT quantity FROM master_holdings WHERE ticker = 'CASH'
   If totalCost > cashBalance → ERROR

3. Record transaction
   INSERT INTO asset_transactions (type, ticker, quantity, price_per_share, total_value)

4. Update holdings
   // Add asset
   UPDATE master_holdings SET quantity = quantity + buyQuantity
   WHERE ticker = X
   
   // Deduct cash
   UPDATE master_holdings SET quantity = quantity - totalCost
   WHERE ticker = 'CASH'

5. Recalculate NAV
```

### 6.4 SELL Transaction

**Process:**
```javascript
1. Check sufficient holdings
   currentHolding = SELECT quantity FROM master_holdings WHERE ticker = X
   If sellQuantity > currentHolding → ERROR

2. Calculate proceeds
   proceeds = quantity × price_per_share

3. Record transaction
   INSERT INTO asset_transactions (type, ticker, quantity, price_per_share, total_value)

4. Update holdings
   // Reduce asset
   UPDATE master_holdings SET quantity = quantity - sellQuantity
   WHERE ticker = X
   
   // Add cash
   UPDATE master_holdings SET quantity = quantity + proceeds
   WHERE ticker = 'CASH'

5. Recalculate NAV
```

---

## 7. Performance Comparison (vs Indices)

### 7.1 Normalized Performance Calculation

**Purpose:** Compare fund performance vs market indices (Nifty 50, Nifty 500) on equal footing

**Formula:**
```
Performance % = ((Current Value - Base Value) / Base Value) × 100

Where Base Value = value on the first day of selected period
```

**Implementation:** `client/src/pages/PortfolioDetailPage.jsx` and `OverallDashboard.jsx`

**Process:**
```javascript
1. Filter data by time period (1D, 1W, 1M, 6M, 1Y, ALL)
   
2. Find first valid day (where fund has data)
   firstValidDay = data.find(d => d.nav_value > 0)

3. Set base values from first day
   baseNav = firstValidDay.nav_value
   baseNifty50 = firstValidDay.nifty50_value
   baseNifty500 = firstValidDay.nifty500_value

4. Calculate normalized performance for each day
   fundPerformance = ((currentNav - baseNav) / baseNav) × 100
   nifty50Performance = ((currentNifty50 - baseNifty50) / baseNifty50) × 100
   nifty500Performance = ((currentNifty500 - baseNifty500) / baseNifty500) × 100
```

**Example:**
```
Day 1 (Base):
  Fund NAV = 10.00
  Nifty 50 = 18,000

Day 30:
  Fund NAV = 11.50
  Nifty 50 = 18,500

Fund Performance = ((11.50 - 10.00) / 10.00) × 100 = 15%
Nifty 50 Performance = ((18,500 - 18,000) / 18,000) × 100 = 2.78%

Result: Fund outperformed Nifty 50 by 12.22%
```

### 7.2 Overall Dashboard Performance

**Special Case:** Aggregates multiple portfolios

**Formula:**
```
Overall NAV = Total Portfolio Value / Total Units (across all portfolios)
```

**Process:**
```javascript
1. For each date, aggregate all portfolios
   dateMap[date].totalValue = Σ(portfolio.total_portfolio_value)
   dateMap[date].totalUnits = Σ(portfolio.total_units_outstanding)

2. Calculate daily overall NAV
   calculatedOverallNav = totalValue / totalUnits

3. Normalize against indices (same as single portfolio)
```

---

## 8. Frontend Calculations

### 8.1 Time Period Filtering

**Filter Options:**
- 1D: Last 1 day
- 1W: Last 7 days  
- 1M: Last 1 month
- 6M: Last 6 months
- 1Y: Last 1 year
- ALL: Complete history

**Implementation:**
```javascript
filterDataByTimePeriod(data, dateKey, timePeriod) {
  cutoffDate = new Date()
  
  switch(timePeriod):
    case '1d': cutoffDate.setDate(cutoffDate.getDate() - 1)
    case '1w': cutoffDate.setDate(cutoffDate.getDate() - 7)
    case '1m': cutoffDate.setMonth(cutoffDate.getMonth() - 1)
    case '6m': cutoffDate.setMonth(cutoffDate.getMonth() - 6)
    case '1y': cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
    case 'all': return all data
  
  return data.filter(item => item.date >= cutoffDate)
}
```

### 8.2 Table Sorting

**Sortable Fields:**
- Allocation %
- Investment Value
- Current Price
- Gain/Loss %
- Current Value

**Logic:**
```javascript
// Augment holdings with numeric fields for sorting
holdings.map(holding => ({
  ...holding,
  allocation: (holding.value / totalPortfolioValue) × 100,
  investment: holding.avgPurchasePrice × holding.quantity,
  gainLoss: holding.gainLossPercentage,
  currentPrice: holding.currentPrice
}))

// Apply stable sort
stableSort(augmentedHoldings, getComparator(order, orderBy))
```

### 8.3 Investment vs Net Investment

**Investment (Asset Level):**
```
Investment = Average Purchase Price × Current Quantity
```

**Net Investment (Portfolio Level):**
```
Net Investment = Total DEPOSITS - Total WITHDRAWALS
```

**Relationship:**
```
Net Investment = CASH + Σ(Investment in each asset) + Realized Gains/Losses
```

---

## 9. Potential Issues & Edge Cases

### 9.1 ✅ VERIFIED - No Issues Found

#### Transaction Cost Basis Calculation
**Status:** ✅ **CORRECT**

**Test Case:** IDEA.NS
```
Transactions:
- BUY 1,010 @ ₹9.00 = ₹9,090
- BUY 100 @ ₹10.00 = ₹1,000
- SELL 200 @ ₹10.68 = ₹2,136

Calculated Results:
- Average Purchase Price: ₹9.09 ✅
- Current Quantity: 910 shares ✅
- Investment Value: ₹8,271.90 ✅
- Current Price: ₹10.00 ✅
- Gain/Loss %: +10.01% ✅
```

**Verification:**
```
Avg Price = (1010×9 + 100×10) / (1010+100) = 10,090 / 1,110 = ₹9.09 ✅
Investment = 9.09 × 910 = ₹8,271.90 ✅
Gain/Loss = ((10.00 - 9.09) / 9.09) × 100 = 10.01% ✅
```

### 9.2 ⚠️ Potential Issues to Monitor

#### Issue 1: Same-Day EOD Update Timing
**Scenario:** Transaction happens at 2 PM, EOD update runs at 6 PM

**Mitigation:** Smart price logic prioritizes transaction price when newer than EOD price

**Recommendation:** ✅ Already handled correctly

#### Issue 2: Missing Price Data
**Scenario:** Asset has no price in `daily_prices` table

**Current Behavior:**
```javascript
if priceResult.rows.length == 0:
    currentPrice = 0
    value = 0  // Asset ignored in portfolio value
```

**Risk:** Portfolio undervalued if prices missing

**Recommendation:** 
- Monitor EOD update success rate
- Add alerts for missing price data
- Consider fallback to transaction price if EOD unavailable

#### Issue 3: Timezone Issues (Date Handling)
**Status:** ✅ **FIXED**

**Solution Implemented:**
```javascript
toLocalDateString(dateString) {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

**Used in:**
- Performance chart normalization
- Date filtering
- Investment history calculation

#### Issue 4: Division by Zero Protection
**Status:** ✅ **PROTECTED**

**Checks in place:**
```javascript
// NAV calculation
NAV = totalUnits > 0 ? (totalValue / totalUnits) : 10

// Gain percentage
gainPct = totalInvestment > 0 ? (gain / totalInvestment) × 100 : 0

// Average price
avgPrice = SUM(quantity) / NULLIF(SUM(quantity), 0)
```

#### Issue 5: Mutual Fund NAV Delays
**Scenario:** MF NAVs published with 1-day delay

**Current Behavior:** Uses latest available NAV from API

**Recommendation:** ✅ Working as intended (MF industry standard)

#### Issue 6: Ticker Symbol Inconsistency (.NS Suffix)
**Status:** ✅ **FIXED**

**Solution:**
```javascript
cleanTicker = ticker.replace('.NS', '')
// All price lookups use cleanTicker
```

**Implemented in:**
- `transactionController.js`
- `eodUpdateService.js`
- `dashboardController.js`

#### Issue 7: Concurrent Transaction Handling
**Protection:** Database transactions with `BEGIN`/`COMMIT`/`ROLLBACK`

**Row Locking:**
```sql
SELECT nav_value FROM nav_history 
WHERE portfolio_id = X 
ORDER BY nav_date DESC LIMIT 1 
FOR UPDATE
```

**Recommendation:** ✅ Properly protected

#### Issue 8: Performance Chart Empty Data
**Scenario:** No index data for selected period

**Handling:**
```javascript
if (!firstValidDay) return []  // Empty chart
```

**Recommendation:** Consider showing message "No data for selected period"

### 9.3 Data Integrity Checks

**Recommended Periodic Checks:**

1. **Holdings vs Transactions Reconciliation:**
```sql
-- Verify master_holdings quantity matches sum of transactions
SELECT ticker,
       (SELECT SUM(CASE WHEN transaction_type='BUY' THEN quantity 
                        WHEN transaction_type='SELL' THEN -quantity END)
        FROM asset_transactions WHERE ticker = mh.ticker) AS calculated_qty,
       mh.quantity AS stored_qty
FROM master_holdings mh
WHERE calculated_qty != stored_qty
```

2. **Units Ledger Consistency:**
```sql
-- Verify total units matches ledger sum
SELECT portfolio_id,
       (SELECT SUM(CASE WHEN transaction_type='DEPOSIT' THEN units
                        WHEN transaction_type='WITHDRAWAL' THEN -units END)
        FROM units_ledger WHERE portfolio_id = nh.portfolio_id) AS calculated_units,
       nh.total_units_outstanding
FROM nav_history nh
WHERE nh.nav_date = CURRENT_DATE
  AND ABS(calculated_units - total_units_outstanding) > 0.01
```

3. **NAV Calculation Verification:**
```sql
-- Recalculate and compare NAV
SELECT portfolio_id, nav_date,
       nav_value AS stored_nav,
       total_portfolio_value / NULLIF(total_units_outstanding, 0) AS calculated_nav
FROM nav_history
WHERE ABS(nav_value - (total_portfolio_value / NULLIF(total_units_outstanding, 0))) > 0.01
```

---

## 10. Summary

### Core Formulas Quick Reference

| Metric | Formula |
|--------|---------|
| **NAV** | `Total Portfolio Value / Total Units` |
| **Avg NAV** | `Total Investment / Total Units` |
| **Units on Deposit** | `Deposit Amount / Current NAV` |
| **Portfolio Value** | `Σ(quantity × current_price) for all assets` |
| **Avg Purchase Price** | `Σ(qty × price) / Σ(qty)` for BUY txns only |
| **Investment Value** | `Avg Purchase Price × Current Quantity` |
| **Gain/Loss %** | `((Current - Avg) / Avg) × 100` |
| **Allocation %** | `(Asset Value / Portfolio Value) × 100` |
| **Normalized Performance** | `((Current - Base) / Base) × 100` |

### System Health Status

✅ **All Core Calculations:** VERIFIED CORRECT  
✅ **Transaction Processing:** WORKING AS DESIGNED  
✅ **Price Logic:** SMART FALLBACK IMPLEMENTED  
✅ **Timezone Handling:** FIXED  
✅ **Division by Zero:** PROTECTED  
✅ **Ticker Normalization:** FIXED  

⚠️ **Monitor:** Missing price data alerts  
⚠️ **Consider:** User-friendly messages for empty charts  

---

**Document Owner:** Portfolio Management System  
**Last Updated:** November 20, 2025  
**Review Cycle:** Quarterly or on major formula changes
