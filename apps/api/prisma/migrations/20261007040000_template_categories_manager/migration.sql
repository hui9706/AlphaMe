CREATE TABLE `TemplateCategory` (
  `id` VARCHAR(191) NOT NULL,
  `nameZh` VARCHAR(191) NOT NULL,
  `nameVi` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TemplateCategory_nameZh_nameVi_key` (`nameZh`, `nameVi`),
  INDEX `TemplateCategory_nameZh_idx` (`nameZh`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `TemplateCategory` (`id`, `nameZh`, `nameVi`, `updatedAt`)
SELECT UUID(), `categoryZh`, `categoryVi`, CURRENT_TIMESTAMP(3)
FROM `Template`
GROUP BY `categoryZh`, `categoryVi`;
