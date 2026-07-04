import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { MailModule } from './shared/mail/mail.module';
import { TelegramModule } from './shared/telegram/telegram.module';
import { TelegramLinkModule } from './modules/telegram/telegram.module';
import { AuditModule } from './modules/audit/audit.module';
import { OrgModule } from './modules/org/org.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LeasesModule } from './modules/leases/leases.module';
import { RentModule } from './modules/rent/rent.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { RepairsModule } from './modules/repairs/repairs.module';
import { ContractorsModule } from './modules/contractors/contractors.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FilesModule } from './modules/files/files.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TagsModule } from './modules/tags/tags.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    QueueModule,
    MailModule,
    TelegramModule,
    TelegramLinkModule,
    AuditModule,
    OrgModule,
    AuthModule,
    UsersModule,
    ApartmentsModule,
    TenantsModule,
    LeasesModule,
    RentModule,
    UtilitiesModule,
    RepairsModule,
    ContractorsModule,
    NotificationsModule,
    WebhooksModule,
    DashboardModule,
    SearchModule,
    ReportsModule,
    FilesModule,
    DocumentsModule,
    TagsModule,
    AccountingModule,
    HealthModule,
  ],
})
export class AppModule {}
