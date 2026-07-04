import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, Box, Typography, Chip, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchQuery, SearchResult } from '../../entities/search/api/searchApi';

const ROUTE_BY_TYPE: Record<SearchResult['type'], (id: string) => string> = {
  apartment: (id) => `/apartments/${id}`,
  tenant: (id) => `/tenants/${id}`,
  repair: (id) => `/repairs/${id}`,
  contractor: () => `/contractors`,
};

export function GlobalSearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  const { data, isFetching } = useSearchQuery(debounced, { skip: debounced.length < 2 });
  const options = data?.data ?? [];

  return (
    <Autocomplete<SearchResult, false, false, false>
      sx={{ width: { xs: 160, sm: 280, md: 360 } }}
      size="small"
      options={options}
      loading={isFetching}
      filterOptions={(x) => x}
      getOptionLabel={(o) => o.title}
      isOptionEqualToValue={(a, b) => a.id === b.id && a.type === b.type}
      noOptionsText={debounced.length < 2 ? t('search.hint') : t('search.noResults')}
      onInputChange={(_e, value) => setInput(value)}
      onChange={(_e, value) => {
        if (value) {
          navigate(ROUTE_BY_TYPE[value.type](value.id));
          setInput('');
        }
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={`${option.type}:${option.id}`}>
          <Box flexGrow={1}>
            <Typography variant="body2">{option.title}</Typography>
            {option.subtitle && (
              <Typography variant="caption" color="text.secondary">
                {option.subtitle}
              </Typography>
            )}
          </Box>
          <Chip label={t(`search.type.${option.type}`)} size="small" variant="outlined" />
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t('search.placeholder')}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}
