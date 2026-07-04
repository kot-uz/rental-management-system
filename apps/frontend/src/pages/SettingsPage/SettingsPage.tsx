import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetOrgQuery,
  useUpdateOrgSettingsMutation,
} from '../../entities/org/api/orgApi';
import {
  useGetMeQuery,
  useUpdateProfileMutation,
} from '../../entities/auth/api/authApi';
import {
  useGetTelegramStatusQuery,
  useLinkMyTelegramMutation,
} from '../../entities/telegram/api/telegramApi';
import { updateUser } from '../../entities/auth/model/authSlice';
import { useAppDispatch } from '../../shared/hooks/useAppSelector';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { TelegramLinkButton } from '../../widgets/TelegramLink/TelegramLinkButton';

const schema = z.object({
  name: z.string().min(1).max(200),
  timezone: z.string().min(1).max(64),
  currency: z.string().length(3),
  locale: z.enum(['en', 'ru', 'uz']),
  rentDueDay: z.coerce.number().int().min(1).max(28),
  lateFeeGraceDays: z.coerce.number().int().min(0).max(31),
  lateFeePercent: z.coerce.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

export function SettingsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can('org:update');
  const [saved, setSaved] = React.useState(false);

  const { data, isLoading } = useGetOrgQuery();
  const [update, { isLoading: saving }] = useUpdateOrgSettingsMutation();

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data?.data) {
      const o = data.data;
      reset({
        name: o.name,
        timezone: o.timezone,
        currency: o.currency,
        locale: (['en', 'ru', 'uz'].includes(o.locale) ? o.locale : 'en') as FormData['locale'],
        rentDueDay: o.rentDueDay,
        lateFeeGraceDays: o.lateFeeGraceDays,
        lateFeePercent: Number(o.lateFeePercent),
      });
    }
  }, [data, reset]);

  const onSubmit = async (form: FormData) => {
    await update(form).unwrap();
    setSaved(true);
  };

  if (isLoading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  }

  return (
    <Box maxWidth={720}>
      <Typography variant="h5" mb={3}>{t('settings.title')}</Typography>

      <ProfileSection />

      <Paper component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          {t('settings.organization')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              {...register('name')}
              label={t('settings.orgName')}
              fullWidth
              disabled={!canEdit}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('timezone')}
              label={t('settings.timezone')}
              fullWidth
              disabled={!canEdit}
              placeholder="Asia/Tashkent"
              error={!!errors.timezone}
              helperText={errors.timezone?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('currency')}
              label={t('settings.currency')}
              fullWidth
              disabled={!canEdit}
              placeholder="USD"
              inputProps={{ maxLength: 3, style: { textTransform: 'uppercase' } }}
              error={!!errors.currency}
              helperText={errors.currency?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              {...register('locale')}
              label={t('settings.locale')}
              select
              fullWidth
              disabled={!canEdit}
              defaultValue={data?.data?.locale ?? 'en'}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ru">Русский</MenuItem>
              <MenuItem value="uz">Oʻzbekcha</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Typography variant="subtitle1" fontWeight={600} mt={4} mb={2}>
          {t('settings.rentPolicy')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              {...register('rentDueDay')}
              label={t('settings.rentDueDay')}
              type="number"
              fullWidth
              disabled={!canEdit}
              error={!!errors.rentDueDay}
              helperText={errors.rentDueDay?.message ?? t('settings.rentDueDayHint')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              {...register('lateFeeGraceDays')}
              label={t('settings.lateFeeGraceDays')}
              type="number"
              fullWidth
              disabled={!canEdit}
              error={!!errors.lateFeeGraceDays}
              helperText={errors.lateFeeGraceDays?.message}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              {...register('lateFeePercent')}
              label={t('settings.lateFeePercent')}
              type="number"
              fullWidth
              disabled={!canEdit}
              inputProps={{ step: '0.01' }}
              error={!!errors.lateFeePercent}
              helperText={errors.lateFeePercent?.message}
            />
          </Grid>
        </Grid>

        {!canEdit && (
          <Alert severity="info" sx={{ mt: 3 }}>{t('settings.readOnly')}</Alert>
        )}

        {canEdit && (
          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={saving || !isDirty}
            >
              {saving ? <CircularProgress size={20} /> : t('common.save')}
            </Button>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSaved(false)}>
          {t('settings.saved')}
        </Alert>
      </Snackbar>
    </Box>
  );
}

const profileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  telegram: z.string().max(100).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [saved, setSaved] = React.useState(false);

  const { data, isLoading } = useGetMeQuery();
  const [update, { isLoading: saving }] = useUpdateProfileMutation();
  const { data: tgStatus } = useGetTelegramStatusQuery();
  const [linkMe] = useLinkMyTelegramMutation();

  const profile = data?.data;

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        telegram: profile.telegram ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (form: ProfileFormData) => {
    const res = await update(form).unwrap();
    dispatch(updateUser({
      firstName: res.data.firstName,
      lastName: res.data.lastName,
      telegram: res.data.telegram,
    }));
    setSaved(true);
  };

  if (isLoading || !profile) {
    return (
      <Paper sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        {t('settings.myProfile')}
      </Typography>

      <Box mb={3}>
        <PhotosSection
          ownerType="user"
          ownerId={profile.id}
          permission="user:update.self"
          purpose="user-photo"
          titleKey="settings.profilePhoto"
          addKey="settings.addProfilePhoto"
          emptyKey="settings.noProfilePhoto"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            {...register('firstName')}
            label={t('auth.firstName')}
            fullWidth
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            {...register('lastName')}
            label={t('auth.lastName')}
            fullWidth
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            {...register('telegram')}
            label={t('settings.telegram')}
            fullWidth
            placeholder="@username"
            error={!!errors.telegram}
            helperText={errors.telegram?.message}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            {t('settings.telegramNotify')}
          </Typography>
          <TelegramLinkButton
            linked={!!tgStatus?.data.linked}
            requestLink={async () => (await linkMe().unwrap()).data}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">
            {t('settings.email')}: {profile.email}
          </Typography>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button type="submit" variant="contained" startIcon={<Save />} disabled={saving || !isDirty}>
          {saving ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
      </Box>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSaved(false)}>
          {t('settings.saved')}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
