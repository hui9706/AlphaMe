ALTER TABLE `User`
  MODIFY `zaloOpenId` VARCHAR(191) NULL,
  ADD COLUMN `username` VARCHAR(191) NULL,
  ADD COLUMN `passwordHash` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `User_username_key`(`username`);
