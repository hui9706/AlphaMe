CREATE TABLE `HomeHeroImages` (
  `id` VARCHAR(191) NOT NULL,
  `leftUrl` TEXT NULL,
  `centerUrl` TEXT NULL,
  `rightUrl` TEXT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
