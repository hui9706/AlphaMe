-- Coin growth foundation: check-ins, plaza activity, share attribution,
-- reward idempotency, risk review, and auditable admin ledger links.

ALTER TABLE `CoinLedger`
  MODIFY `type` ENUM('INITIAL_GRANT', 'RESERVATION', 'GENERATION_CHARGE', 'REFUND', 'ADMIN_ADJUSTMENT', 'REWARD', 'REWARD_REVERSAL') NOT NULL,
  ADD COLUMN `adminUserId` VARCHAR(191) NULL,
  ADD COLUMN `rewardRecordId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `CoinLedger_rewardRecordId_key`(`rewardRecordId`),
  ADD INDEX `CoinLedger_adminUserId_createdAt_idx`(`adminUserId`, `createdAt`),
  ADD INDEX `CoinLedger_rewardRecordId_idx`(`rewardRecordId`);

CREATE TABLE `DailyCheckIn` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `checkInDate` DATE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `DailyCheckIn_userId_checkInDate_key`(`userId`, `checkInDate`),
  INDEX `DailyCheckIn_checkInDate_idx`(`checkInDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlazaWork` (
  `id` VARCHAR(191) NOT NULL,
  `generationId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PlazaWork_generationId_key`(`generationId`),
  INDEX `PlazaWork_userId_publishedAt_idx`(`userId`, `publishedAt`),
  INDEX `PlazaWork_publishedAt_idx`(`publishedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlazaLike` (
  `id` VARCHAR(191) NOT NULL,
  `plazaWorkId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PlazaLike_plazaWorkId_userId_key`(`plazaWorkId`, `userId`),
  INDEX `PlazaLike_userId_createdAt_idx`(`userId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShareAttribution` (
  `id` VARCHAR(191) NOT NULL,
  `shareToken` VARCHAR(191) NOT NULL,
  `generationId` VARCHAR(191) NOT NULL,
  `sharerId` VARCHAR(191) NOT NULL,
  `friendId` VARCHAR(191) NULL,
  `openedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ShareAttribution_shareToken_key`(`shareToken`),
  UNIQUE INDEX `ShareAttribution_generationId_sharerId_friendId_key`(`generationId`, `sharerId`, `friendId`),
  INDEX `ShareAttribution_generationId_sharerId_idx`(`generationId`, `sharerId`),
  INDEX `ShareAttribution_friendId_openedAt_idx`(`friendId`, `openedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RewardRecord` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('DAILY_CHECK_IN', 'SHARE_OPEN', 'PLAZA_LIKE', 'ADMIN_ADJUSTMENT', 'ADMIN_REVERSAL') NOT NULL,
  `status` ENUM('GRANTED', 'REVOKED', 'BLOCKED') NOT NULL DEFAULT 'GRANTED',
  `amount` INTEGER NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `note` VARCHAR(191) NULL,
  `revokedAt` DATETIME(3) NULL,
  `revokedByAdminId` VARCHAR(191) NULL,
  `revokeReason` VARCHAR(191) NULL,
  `dailyCheckInId` VARCHAR(191) NULL,
  `plazaLikeId` VARCHAR(191) NULL,
  `plazaWorkId` VARCHAR(191) NULL,
  `shareId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RewardRecord_idempotencyKey_key`(`idempotencyKey`),
  UNIQUE INDEX `RewardRecord_dailyCheckInId_key`(`dailyCheckInId`),
  UNIQUE INDEX `RewardRecord_plazaLikeId_key`(`plazaLikeId`),
  UNIQUE INDEX `RewardRecord_shareId_key`(`shareId`),
  INDEX `RewardRecord_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `RewardRecord_type_status_createdAt_idx`(`type`, `status`, `createdAt`),
  INDEX `RewardRecord_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
  INDEX `RewardRecord_plazaWorkId_idx`(`plazaWorkId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RewardRiskEvent` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN', 'REVIEWED', 'CLEARED', 'BLOCKED') NOT NULL DEFAULT 'OPEN',
  `score` INTEGER NOT NULL DEFAULT 0,
  `sourceType` VARCHAR(191) NULL,
  `sourceId` VARCHAR(191) NULL,
  `detail` VARCHAR(191) NULL,
  `reviewedByAdminId` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RewardRiskEvent_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `RewardRiskEvent_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CoinLedger` ADD CONSTRAINT `CoinLedger_adminUserId_fkey` FOREIGN KEY (`adminUserId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CoinLedger` ADD CONSTRAINT `CoinLedger_rewardRecordId_fkey` FOREIGN KEY (`rewardRecordId`) REFERENCES `RewardRecord`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `DailyCheckIn` ADD CONSTRAINT `DailyCheckIn_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PlazaWork` ADD CONSTRAINT `PlazaWork_generationId_fkey` FOREIGN KEY (`generationId`) REFERENCES `Generation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PlazaWork` ADD CONSTRAINT `PlazaWork_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PlazaLike` ADD CONSTRAINT `PlazaLike_plazaWorkId_fkey` FOREIGN KEY (`plazaWorkId`) REFERENCES `PlazaWork`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PlazaLike` ADD CONSTRAINT `PlazaLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ShareAttribution` ADD CONSTRAINT `ShareAttribution_generationId_fkey` FOREIGN KEY (`generationId`) REFERENCES `Generation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ShareAttribution` ADD CONSTRAINT `ShareAttribution_sharerId_fkey` FOREIGN KEY (`sharerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ShareAttribution` ADD CONSTRAINT `ShareAttribution_friendId_fkey` FOREIGN KEY (`friendId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RewardRecord` ADD CONSTRAINT `RewardRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RewardRecord` ADD CONSTRAINT `RewardRecord_dailyCheckInId_fkey` FOREIGN KEY (`dailyCheckInId`) REFERENCES `DailyCheckIn`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RewardRecord` ADD CONSTRAINT `RewardRecord_plazaLikeId_fkey` FOREIGN KEY (`plazaLikeId`) REFERENCES `PlazaLike`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RewardRecord` ADD CONSTRAINT `RewardRecord_plazaWorkId_fkey` FOREIGN KEY (`plazaWorkId`) REFERENCES `PlazaWork`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RewardRecord` ADD CONSTRAINT `RewardRecord_shareId_fkey` FOREIGN KEY (`shareId`) REFERENCES `ShareAttribution`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RewardRecord` ADD CONSTRAINT `RewardRecord_revokedByAdminId_fkey` FOREIGN KEY (`revokedByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RewardRiskEvent` ADD CONSTRAINT `RewardRiskEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RewardRiskEvent` ADD CONSTRAINT `RewardRiskEvent_reviewedByAdminId_fkey` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
