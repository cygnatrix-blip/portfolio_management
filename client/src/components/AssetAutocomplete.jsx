import React, { useState, useMemo } from 'react';
import { TextField, Autocomplete, CircularProgress, Box, Typography } from '@mui/material';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '@mui/material/utils';

// Get token from localStorage
const getAuthToken = () => localStorage.getItem('token');

const fetchAssets = async (query) => {
  if (query.length < 2) return []; // Don't search for less than 2 characters
  const token = getAuthToken();
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // Search both stocks and mutual funds at the same time
  const [stockRes, mfRes] = await Promise.all([
    axios.get(`/api/assets/search-stocks?query=${query}`, config),
    axios.get(`/api/assets/search-mf?query=${query}`, config),
  ]);

  // Combine and format results
  const stocks = stockRes.data.map(s => ({ ...s, type: 'Stock' }));
  const mfs = mfRes.data.map(m => ({ ...m, type: 'Mutual Fund' }));
  
  return [...stocks, ...mfs];
};

const AssetAutocomplete = ({ onAssetSelected }) => {
  const [inputValue, setInputValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assetSearch', inputValue],
    queryFn: () => fetchAssets(inputValue),
    keepPreviousData: true,
  });

  const options = data || [];

  // Debounce the input change to avoid excessive API calls
  const debouncedSetInputValue = useMemo(
    () =>
      debounce((value) => {
        setInputValue(value);
      }, 300),
    []
  );

  return (
    <Autocomplete
      id="asset-search-autocomplete"
      options={options}
      getOptionLabel={(option) => option.name ? `${option.name} (${option.symbol})` : ''}
      isOptionEqualToValue={(option, value) => option.symbol === value.symbol}
      onInputChange={(event, newInputValue) => {
        debouncedSetInputValue(newInputValue);
      }}
      onChange={(event, newValue) => {
        onAssetSelected(newValue); // Pass the whole { symbol, name, type } object up
      }}
      loading={isLoading}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Stock or Mutual Fund"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.symbol}>
          <Box>
            <Typography variant="body1">{option.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {option.symbol} - {option.type}
            </Typography>
          </Box>
        </li>
      )}
    />
  );
};

export default AssetAutocomplete;