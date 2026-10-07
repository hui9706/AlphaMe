-- Configurable new-user and invitation rewards.
ALTER TABLE `RewardRecord`
  MODIFY `type` ENUM('NEW_USER', 'INVITEE_BONUS', 'DAILY_CHECK_IN', 'SHARE_OPEN', 'PLAZA_LIKE', 'ADMIN_ADJUSTMENT', 'ADMIN_REVERSAL') NOT NULL;

CREATE TABLE `CoinRewardConfig` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'default',
  `newUserAmount` INTEGER NOT NULL DEFAULT 10,
  `inviteeBonusAmount` INTEGER NOT NULL DEFAULT 10,
  `inviterAmount` INTEGER NOT NULL DEFAULT 10,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
