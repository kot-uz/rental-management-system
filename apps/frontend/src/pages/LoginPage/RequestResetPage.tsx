import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForgotPasswordMutation } from '../../entities/auth/api/authApi';

const makeSchema = (t: (k: string) => string) =>
  z.object({ email: z.string().email(t('validation.invalidEmail')) });

type FormData = { email: string };

export function RequestResetPage() {
  const { t } = useTranslation();
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(makeSchema(t)) });

  const onSubmit = async (data: FormData) => {
    try {
      await forgotPassword(data).unwrap();
    } catch {
      // The endpoint always succeeds (no user enumeration); ignore errors.
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={0.5}>
          {t('auth.resetTitle')}
        </Typography>
        <Typography color="text.secondary" mb={3} variant="body2">
          {t('auth.resetSubtitle')}
        </Typography>

        {isSuccess ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('auth.resetEmailSent')}
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              label={t('auth.email')}
              type="email"
              fullWidth
              sx={{ mb: 3 }}
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {t('auth.sendResetLink')}
            </Button>
          </Box>
        )}

        <Box mt={2} textAlign="center">
          <Link to="/login" style={{ color: 'inherit', fontSize: 14 }}>
            {t('auth.backToSignIn')}
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
