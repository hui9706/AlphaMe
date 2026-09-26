ALTER TABLE `Asset` ADD COLUMN `storageProvider` VARCHAR(191) NOT NULL DEFAULT 'local';

CREATE TABLE `StorageConfig` (
  `id` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL DEFAULT 'local',
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `qiniuAccessKey` VARCHAR(191) NULL,
  `qiniuSecretKey` VARCHAR(191) NULL,
  `qiniuBucket` VARCHAR(191) NULL,
  `qiniuRegion` VARCHAR(191) NULL,
  `qiniuDomain` VARCHAR(191) NULL,
  `qiniuPrivate` BOOLEAN NOT NULL DEFAULT true,
  `qiniuUrlTtlSeconds` INTEGER NOT NULL DEFAULT 2592000,
  `fallbackLocal` BOOLEAN NOT NULL DEFAULT true,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
