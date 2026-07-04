import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLoginMutation } from '../../entities/auth/api/authApi';
import { useAppDispatch } from '../../shared/hooks/useAppSelector';
import { setCredentials } from '../../entities/auth/model/authSlice';

const makeSchema = (t: (k: string) => string) =>
  z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });

type FormData = { email: string; password: string };

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(makeSchema(t)),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await login(data).unwrap();
      const r = result as { data: { accessToken: string; refreshToken: string; user: unknown } };
      dispatch(setCredentials({
        accessToken: r.data.accessToken,
        refreshToken: r.data.refreshToken,
        user: r.data.user as Parameters<typeof setCredentials>[0]['user'],
      }));
      navigate('/');
    } catch {
      // error handled by RTK
    }
  };

  const apiError = error && 'data' in error ? (error.data as { error?: { message?: string } })?.error?.message : null;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={0.5}>
          {t('auth.appName')}
        </Typography>
        <Typography color="text.secondary" mb={3} variant="body2">
          {t('auth.signInSubtitle')}
        </Typography>

        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('email')}
            label={t('auth.email')}
            type="email"
            fullWidth
            sx={{ mb: 2 }}
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
          />
          <TextField
            {...register('password')}
            label={t('auth.password')}
            type="password"
            fullWidth
            sx={{ mb: 3 }}
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="current-password"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {t('auth.signIn')}
          </Button>
        </Box>

        <Box mt={2} textAlign="center">
          <Link to="/forgot-password" style={{ color: 'inherit', fontSize: 14 }}>
            {t('auth.forgotPassword')}
          </Link>
        </Box>

        <Box mt={1} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            {t('auth.noAccount')}{' '}
            <Link to="/register" style={{ color: 'inherit' }}>{t('auth.register')}</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
