import React, { useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetOrgQuery, useUpdateOrgSettingsMutation } from '../../entities/org/api/orgApi';
import { useGetMeQuery, useUpdateProfileMutation } from '../../entities/auth/api/authApi';
import {
  useGetTelegramStatusQuery,
  useLinkMyTelegramMutation,
} from '../../entities/telegram/api/telegramApi';
import { updateUser } from '../../entities/auth/model/authSlice';
import { useAppDispatch } from '../../shared/hooks/useAppSelector';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { TelegramLinkButton } from '../../widgets/TelegramLink/TelegramLinkButton';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const { data, isLoading } = useGetOrgQuery();
  const [update, { isLoading: saving }] = useUpdateOrgSettingsMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
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
    toast.success(t('settings.saved'));
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('settings.title')}</h1>

      <ProfileSection />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <h2 className="mb-4 font-semibold">{t('settings.organization')}</h2>
            <div className="space-y-4">
              <Field label={t('settings.orgName')} htmlFor="org-name" error={errors.name?.message}>
                <Input id="org-name" disabled={!canEdit} {...register('name')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('settings.timezone')} htmlFor="org-tz" error={errors.timezone?.message}>
                  <Input id="org-tz" placeholder="Asia/Tashkent" disabled={!canEdit} {...register('timezone')} />
                </Field>
                <Field label={t('settings.currency')} htmlFor="org-currency" error={errors.currency?.message}>
                  <Input
                    id="org-currency"
                    placeholder="USD"
                    maxLength={3}
                    className="uppercase"
                    disabled={!canEdit}
                    {...register('currency')}
                  />
                </Field>
                <Field label={t('settings.locale')}>
                  <Select
                    value={watch('locale')}
                    onValueChange={(v) => setValue('locale', v as FormData['locale'], { shouldDirty: true })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="uz">Oʻzbekcha</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <h2 className="mb-4 mt-8 font-semibold">{t('settings.rentPolicy')}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('settings.rentDueDay')} htmlFor="org-dueday" error={errors.rentDueDay?.message}>
                <Input id="org-dueday" type="number" disabled={!canEdit} {...register('rentDueDay')} />
                {!errors.rentDueDay && (
                  <p className="text-xs text-muted-foreground">{t('settings.rentDueDayHint')}</p>
                )}
              </Field>
              <Field
                label={t('settings.lateFeeGraceDays')}
                htmlFor="org-grace"
                error={errors.lateFeeGraceDays?.message}
              >
                <Input id="org-grace" type="number" disabled={!canEdit} {...register('lateFeeGraceDays')} />
              </Field>
              <Field
                label={t('settings.lateFeePercent')}
                htmlFor="org-latefee"
                error={errors.lateFeePercent?.message}
              >
                <Input id="org-latefee" type="number" step="0.01" disabled={!canEdit} {...register('lateFeePercent')} />
              </Field>
            </div>

            {!canEdit && (
              <Alert className="mt-6">
                <AlertDescription>{t('settings.readOnly')}</AlertDescription>
              </Alert>
            )}

            {canEdit && (
              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={saving || !isDirty}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
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

  const { data, isLoading } = useGetMeQuery();
  const [update, { isLoading: saving }] = useUpdateProfileMutation();
  const { data: tgStatus } = useGetTelegramStatusQuery();
  const [linkMe] = useLinkMyTelegramMutation();

  const profile = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

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
    dispatch(
      updateUser({
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        telegram: res.data.telegram,
      }),
    );
    toast.success(t('settings.saved'));
  };

  if (isLoading || !profile) {
    return (
      <Card className="mb-4">
        <CardContent className="flex justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h2 className="mb-4 font-semibold">{t('settings.myProfile')}</h2>

          <div className="mb-6">
            <PhotosSection
              ownerType="user"
              ownerId={profile.id}
              permission="user:update.self"
              purpose="user-photo"
              titleKey="settings.profilePhoto"
              addKey="settings.addProfilePhoto"
              emptyKey="settings.noProfilePhoto"
            />
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('auth.firstName')} htmlFor="pf-first" error={errors.firstName?.message}>
                <Input id="pf-first" {...register('firstName')} />
              </Field>
              <Field label={t('auth.lastName')} htmlFor="pf-last" error={errors.lastName?.message}>
                <Input id="pf-last" {...register('lastName')} />
              </Field>
            </div>
            <Field label={t('settings.telegram')} htmlFor="pf-telegram" error={errors.telegram?.message}>
              <Input id="pf-telegram" placeholder="@username" {...register('telegram')} />
            </Field>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t('settings.telegramNotify')}</p>
              <TelegramLinkButton
                linked={!!tgStatus?.data.linked}
                requestLink={async () => (await linkMe().unwrap()).data}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.email')}: {profile.email}
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
