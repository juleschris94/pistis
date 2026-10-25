import { createHashRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router';
import { HomeScreen } from '../features/home/HomeScreen';
import { GoalEditScreen } from '../features/projects/GoalEditScreen';
import { GoalWizard } from '../features/projects/GoalWizard';
import { NewProjectScreen } from '../features/projects/NewProjectScreen';
import { ProjectDetailScreen } from '../features/projects/ProjectDetailScreen';
import { ProjectsScreen } from '../features/projects/ProjectsScreen';
import { TemplateScreen, TemplatesScreen } from '../features/projects/TemplatesScreen';
import { ModuleScreen } from '../features/modules/ModuleScreen';
import { PlanningScreen } from '../features/agenda/PlanningScreen';
import { AccountScreen } from '../features/finance/AccountScreen';
import { FinanceImportScreen } from '../features/finance/FinanceImportScreen';
import { FinanceScreen } from '../features/finance/FinanceScreen';
import { TransactionsScreen } from '../features/finance/TransactionsScreen';
import { ConnectorsScreen } from '../features/settings/ConnectorsScreen';
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

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.home, element: <HomeScreen /> },
      { path: ROUTES.projects, element: <ProjectsScreen /> },
      { path: ROUTES.projectNew, element: <NewProjectScreen /> },
      { path: ROUTES.templates, element: <TemplatesScreen /> },
      { path: ROUTES.template, element: <TemplateScreen /> },
      { path: ROUTES.wizard, element: <GoalWizard /> },
      { path: ROUTES.project, element: <ProjectDetailScreen /> },
      { path: ROUTES.projectEdit, element: <GoalEditScreen /> },
      { path: ROUTES.planning, element: <PlanningScreen /> },
      { path: ROUTES.tracking, element: <ModuleScreen module="tracking" /> },
      { path: ROUTES.finance, element: <FinanceScreen /> },
      { path: ROUTES.financeImport, element: <FinanceImportScreen /> },
      { path: ROUTES.transactions, element: <TransactionsScreen /> },
      { path: ROUTES.account, element: <AccountScreen /> },
      { path: ROUTES.connectors, element: <ConnectorsScreen /> },
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
];

// La version web hébergée tourne dans une page intégrée dont l'adresse ne peut pas changer : routeur en mémoire.
export const router = import.meta.env.MODE === 'hosted' ? createMemoryRouter(routes) : createHashRouter(routes);
