# Sector-Based Portfolio Allocation Implementation

## Overview
This feature adds **NSE sector-based portfolio analysis** to your portfolio manager. Users can now:
- Toggle between **Asset View** and **Sector View** in the donut chart
- Click on sectors to see detailed breakdown of holdings
- Analyze portfolio diversification across sectors
- Track sector-wise performance

## Implementation Steps

### 1. Database Migration
Run the sector column migration:
```bash
cd server
node scripts/runSectorMigration.js
```

This adds:
- `sector` column to `nse_symbols` table
- `industry` column to `nse_symbols` table  
- Index on sector for faster queries

### 2. Update NSE Symbols with Sector Data
Run the EOD update to download NSE sector classifications:
```bash
cd server
node scripts/runEodUpdate.js
```

This will:
- Download NSE Nifty 500 list with sector info
- Map sectors to all stocks in your database
- Populate the sector column automatically

### 3. Restart Server
The backend changes are already in place:
```bash
cd server
npm start
```

### 4. Rebuild Frontend
```bash
cd client
npm run build
```

## Features Added

### Backend Changes
1. **`updateNseSymbolsService.js`**
   - Downloads NSE sector classification from Nifty 500 list
   - Maps sectors to stock symbols
   - Stores sector info in database

2. **`dashboardController.js`**
   - Returns sector information with holdings
   - Calculates sector-wise allocation
   - Groups holdings by sector (Stocks, Mutual Funds, Cash)

### Frontend Changes
1. **`SectorDrilldownModal.jsx`** (New Component)
   - Shows detailed holdings for selected sector
   - Displays sector performance (gain/loss)
   - Lists all assets within the sector with metrics

2. **`PortfolioDetailPage.jsx`**
   - Added Asset/Sector view toggle
   - Donut chart switches between views
   - Click sector → opens drilldown modal
   - Click asset → opens ticker history modal

## How It Works

### Sector Classification
- **Stocks**: Classified by NSE official sector (from Nifty 500 list)
- **Mutual Funds**: Grouped as "Mutual Funds" sector
- **Cash**: Grouped as "Cash & Equivalents" sector
- **Uncategorized**: Grouped as "Others" sector

### NSE Sectors (Examples)
- Financial Services
- Information Technology
- Consumer Goods
- Pharmaceuticals
- Energy
- Automobiles
- Telecom
- Metals
- Realty
- And more...

## User Experience

### Asset View (Default)
```
Holdings Allocation (Click a slice)
[ ● Asset View ] [ ○ Sector View ]

Donut Chart shows:
- HDFCBANK.NS (15%)
- RELIANCE.NS (12%)
- TCS.NS (10%)
- etc.
```

### Sector View
```
Holdings Allocation (By Sector)
[ ○ Asset View ] [ ● Sector View ]

Donut Chart shows:
- Financial Services (30%)
- Information Technology (25%)
- Energy (20%)
- Mutual Funds (15%)
- Cash & Equivalents (10%)
```

### Clicking a Sector
Opens modal showing:
```
┌──────────────────────────────────────────────┐
│ Financial Services                           │
│ 5 holdings • 30% of portfolio                │
├──────────────────────────────────────────────┤
│ Total Value: ₹2,50,000                       │
│ Investment: ₹2,00,000                        │
│ Gain/Loss: ₹50,000 (+25%)                   │
├──────────────────────────────────────────────┤
│ HDFCBANK.NS    ₹1,20,000    48%              │
│ ICICIBANK.NS   ₹80,000      32%              │
│ AXISBANK.NS    ₹50,000      20%              │
└──────────────────────────────────────────────┘
```

## Benefits

✅ **Better Portfolio Analysis**: Understand sector concentration  
✅ **Risk Management**: Identify over-exposure to specific sectors  
✅ **Official Data**: Uses NSE classifications (most reliable)  
✅ **Professional Features**: Similar to Bloomberg/Morningstar  
✅ **Flexible Views**: Toggle between asset and sector views  

## Troubleshooting

### No Sectors Showing?
1. Check if migration ran: `SELECT sector FROM nse_symbols LIMIT 10;`
2. Run EOD update to download sector data
3. Check console logs for download errors

### Sectors Showing as "Others"?
- Stock may not be in Nifty 500 (smaller companies)
- Sector data will be populated next time EOD update runs
- You can manually add sectors if needed

### Manual Sector Update (Optional)
```sql
UPDATE nse_symbols 
SET sector = 'Financial Services' 
WHERE ticker IN ('HDFCBANK', 'ICICIBANK', 'AXISBANK');
```

## Future Enhancements

**Phase 2 Ideas:**
- Sector performance charts over time
- Compare sector allocation vs Nifty 50/500 benchmarks
- Sector diversification score
- Alerts for over-concentration
- Sector rebalancing suggestions

## Testing Checklist

- [ ] Database migration successful
- [ ] EOD update downloads sector data
- [ ] Backend returns sectorAllocation array
- [ ] Frontend toggle switches views correctly
- [ ] Clicking sector opens drilldown modal
- [ ] Modal shows correct holdings and calculations
- [ ] Search/filter works in holdings table
- [ ] Performance is acceptable with large portfolios

## Notes

- Sector data updates automatically during weekly symbol refresh
- Mutual funds are always grouped as "Mutual Funds" sector
- Cash is always "Cash & Equivalents" sector
- Stocks without sector info show as "Others"
