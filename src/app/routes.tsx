import { createHashRouter, Navigate } from 'react-router';
import { HomeScreen } from '../features/home/HomeScreen';
import { ModuleScreen } from '../features/modules/ModuleScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { AppearanceScreen } from '../features/settings/AppearanceScreen';
import { BackupScreen } from '../features/settings/BackupScreen';
import { CategoriesScreen } from '../features/settings/CategoriesScreen';
import { LanguageScreen } from '../features/settings/LanguageScreen';
import { PrivacyScreen } from '../features/settings/PrivacyScreen';
import { ProfileEditScreen } from '../features/settings/ProfileEditScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { AppShell } from './AppShell';
import { ROUTES } from './paths';

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.home, element: <HomeScreen /> },
      { path: ROUTES.projects, element: <ModuleScreen module="projects" /> },
      { path: ROUTES.planning, element: <ModuleScreen module="planning" /> },
      { path: ROUTES.tracking, element: <ModuleScreen module="tracking" /> },
      { path: ROUTES.finance, element: <ModuleScreen module="finance" /> },
      { path: ROUTES.notifications, element: <NotificationsScreen /> },
      { path: ROUTES.settings, element: <SettingsScreen /> },
      { path: ROUTES.profileEdit, element: <ProfileEditScreen /> },
      { path: ROUTES.categories, element: <CategoriesScreen /> },
      { path: ROUTES.appearance, element: <AppearanceScreen /> },
      { path: ROUTES.language, element: <LanguageScreen /> },
      { path: ROUTES.backup, element: <BackupScreen /> },
      { path: ROUTES.privacy, element: <PrivacyScreen /> },
      { path: '*', element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
]);
