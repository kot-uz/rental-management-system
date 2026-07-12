import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, Loader2 } from 'lucide-react';
import { useLoginMutation, useRegisterMutation } from '../../entities/auth/api/authApi';
import { useAppDispatch, useAppSelector } from '../../shared/hooks/useAppSelector';
import { setCredentials } from '../../entities/auth/model/authSlice';
import { APP_BASE } from '../../shared/config/routes';
import { Field } from '../../shared/ui/Field';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type AuthTab = 'login' | 'register';

type AuthResponse = { data: { accessToken: string; refreshToken: string; user: unknown } };

const makeLoginSchema = (t: (k: string) => string) =>
  z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });

const makeRegisterSchema = (t: (k: string) => string) =>
  z.object({
    orgName: z.string().min(2, t('validation.orgNameRequired')),
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(8, t('validation.minPassword')),
  });

type LoginForm = { email: string; password: string };
type RegisterForm = {
  orgName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

function extractApiError(error: unknown): string | null {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: { message?: string } } }).data;
    return data?.error?.message ?? null;
  }
  return null;
}

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const requestedTab = (location.state as { auth?: AuthTab } | null)?.auth;
  const [tab, setTab] = useState<AuthTab>(requestedTab ?? 'login');

  useEffect(() => {
    if (requestedTab) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [login, { isLoading: loginLoading, error: loginError }] = useLoginMutation();
  const [registerUser, { isLoading: registerLoading, error: registerError }] =
    useRegisterMutation();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(makeLoginSchema(t)) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(makeRegisterSchema(t)) });

  if (accessToken) return <Navigate to={APP_BASE} replace />;

  const applyCredentials = (result: unknown) => {
    const r = result as AuthResponse;
    dispatch(
      setCredentials({
        accessToken: r.data.accessToken,
        refreshToken: r.data.refreshToken,
        user: r.data.user as Parameters<typeof setCredentials>[0]['user'],
      }),
    );
    navigate(APP_BASE);
  };

  const onLogin = async (data: LoginForm) => {
    try {
      applyCredentials(await login(data).unwrap());
    } catch {
      // error handled by RTK
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      applyCredentials(await registerUser(data).unwrap());
    } catch {
      // error handled by RTK
    }
  };

  const apiError = extractApiError(tab === 'login' ? loginError : registerError);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-center text-xl font-bold">{t('auth.appName')}</h1>
          <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
            {tab === 'login' ? t('auth.signInSubtitle') : t('auth.createAccountSubtitle')}
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
            </TabsList>

            {apiError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form
                onSubmit={loginForm.handleSubmit(onLogin)}
                noValidate
                className="mt-4 space-y-4"
              >
                <Field
                  label={t('auth.email')}
                  htmlFor="login-email"
                  error={loginForm.formState.errors.email?.message}
                >
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    {...loginForm.register('email')}
                  />
                </Field>
                <Field
                  label={t('auth.password')}
                  htmlFor="login-password"
                  error={loginForm.formState.errors.password?.message}
                >
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signIn')}
                </Button>
                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form
                onSubmit={registerForm.handleSubmit(onRegister)}
                noValidate
                className="mt-4 space-y-4"
              >
                <Field
                  label={t('auth.orgName')}
                  htmlFor="reg-org"
                  error={registerForm.formState.errors.orgName?.message}
                >
                  <Input id="reg-org" {...registerForm.register('orgName')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label={t('auth.firstName')}
                    htmlFor="reg-first"
                    error={registerForm.formState.errors.firstName?.message}
                  >
                    <Input id="reg-first" {...registerForm.register('firstName')} />
                  </Field>
                  <Field
                    label={t('auth.lastName')}
                    htmlFor="reg-last"
                    error={registerForm.formState.errors.lastName?.message}
                  >
                    <Input id="reg-last" {...registerForm.register('lastName')} />
                  </Field>
                </div>
                <Field
                  label={t('auth.email')}
                  htmlFor="reg-email"
                  error={registerForm.formState.errors.email?.message}
                >
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    {...registerForm.register('email')}
                  />
                </Field>
                <Field
                  label={t('auth.password')}
                  htmlFor="reg-password"
                  error={registerForm.formState.errors.password?.message}
                >
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    {...registerForm.register('password')}
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={registerLoading}>
                  {registerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
