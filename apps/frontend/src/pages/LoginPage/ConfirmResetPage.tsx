import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResetPasswordMutation } from '../../entities/auth/api/authApi';

const makeSchema = (t: (k: string) => string) =>
  z
    .object({
      newPassword: z.string().min(8, t('validation.minPassword')),
      confirm: z.string().min(8, t('validation.minPassword')),
    })
    .refine((d) => d.newPassword === d.confirm, {
      message: t('validation.passwordsMismatch'),
      path: ['confirm'],
    });

type FormData = { newPassword: string; confirm: string };

export function ConfirmResetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(makeSchema(t)) });

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword({ token, newPassword: data.newPassword }).unwrap();
      navigate('/login', { replace: true });
    } catch {
      // surfaced via `error` below
    }
  };

  const apiError =
    error && 'data' in error
      ? (error.data as { error?: { message?: string } })?.error?.message
      : null;

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
          {t('auth.newPasswordTitle')}
        </Typography>
        <Typography color="text.secondary" mb={3} variant="body2">
          {t('auth.newPasswordSubtitle')}
        </Typography>

        {!token && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('auth.resetTokenMissing')}
          </Alert>
        )}
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('auth.resetTokenInvalid')}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('newPassword')}
            label={t('auth.newPassword')}
            type="password"
            fullWidth
            sx={{ mb: 2 }}
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
            autoComplete="new-password"
          />
          <TextField
            {...register('confirm')}
            label={t('auth.confirmPassword')}
            type="password"
            fullWidth
            sx={{ mb: 3 }}
            error={!!errors.confirm}
            helperText={errors.confirm?.message}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoading || !token}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {t('auth.setNewPassword')}
          </Button>
        </Box>

        <Box mt={2} textAlign="center">
          <Link to="/login" style={{ color: 'inherit', fontSize: 14 }}>
            {t('auth.backToSignIn')}
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
