CREATE TABLE `VolcengineConfig` (
  `id` VARCHAR(191) NOT NULL,
  `accessKey` VARCHAR(191) NULL,
  `secretKey` VARCHAR(191) NULL,
  `region` VARCHAR(191) NOT NULL DEFAULT 'cn-beijing',
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
