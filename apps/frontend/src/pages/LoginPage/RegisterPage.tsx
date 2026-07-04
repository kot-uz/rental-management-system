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
  Grid,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRegisterMutation } from '../../entities/auth/api/authApi';
import { useAppDispatch } from '../../shared/hooks/useAppSelector';
import { setCredentials } from '../../entities/auth/model/authSlice';

const makeSchema = (t: (k: string) => string) =>
  z.object({
    orgName: z.string().min(2, t('validation.orgNameRequired')),
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(8, t('validation.minPassword')),
  });

type FormData = { orgName: string; firstName: string; lastName: string; email: string; password: string };

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();

  const { register: formReg, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(makeSchema(t)),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await register(data).unwrap();
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
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={0.5}>
          {t('auth.createAccount')}
        </Typography>
        <Typography color="text.secondary" mb={3} variant="body2">
          {t('auth.createAccountSubtitle')}
        </Typography>

        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{String(apiError)}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...formReg('orgName')}
            label={t('auth.orgName')}
            fullWidth
            sx={{ mb: 2 }}
            error={!!errors.orgName}
            helperText={errors.orgName?.message}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField {...formReg('firstName')} label={t('auth.firstName')} fullWidth error={!!errors.firstName} helperText={errors.firstName?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField {...formReg('lastName')} label={t('auth.lastName')} fullWidth error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Grid>
          </Grid>
          <TextField {...formReg('email')} label={t('auth.email')} type="email" fullWidth sx={{ mb: 2 }} error={!!errors.email} helperText={errors.email?.message} />
          <TextField {...formReg('password')} label={t('auth.password')} type="password" fullWidth sx={{ mb: 3 }} error={!!errors.password} helperText={errors.password?.message} />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}>
            {t('auth.createAccount')}
          </Button>
        </Box>

        <Box mt={2} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" style={{ color: 'inherit' }}>{t('auth.signInLink')}</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
