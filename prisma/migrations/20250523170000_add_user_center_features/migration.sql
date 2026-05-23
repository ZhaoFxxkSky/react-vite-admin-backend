-- CreateTable
CREATE TABLE `tds_login_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `username` VARCHAR(50) NULL,
    `ip` VARCHAR(50) NULL,
    `user_agent` VARCHAR(500) NULL,
    `location` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'success',
    `message` VARCHAR(255) NULL,
    `login_type` VARCHAR(20) NOT NULL DEFAULT 'password',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tds_login_logs_user_id_idx`(`user_id`),
    INDEX `tds_login_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_password_policies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `min_length` INTEGER NOT NULL DEFAULT 8,
    `max_length` INTEGER NOT NULL DEFAULT 32,
    `require_uppercase` BOOLEAN NOT NULL DEFAULT true,
    `require_lowercase` BOOLEAN NOT NULL DEFAULT true,
    `require_numbers` BOOLEAN NOT NULL DEFAULT true,
    `require_symbols` BOOLEAN NOT NULL DEFAULT false,
    `expiry_days` INTEGER NOT NULL DEFAULT 90,
    `history_count` INTEGER NOT NULL DEFAULT 5,
    `max_login_attempts` INTEGER NOT NULL DEFAULT 5,
    `lockout_duration` INTEGER NOT NULL DEFAULT 30,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_password_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tds_password_histories_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tds_posts_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_user_posts` (
    `user_id` INTEGER NOT NULL,
    `post_id` INTEGER NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_dict_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tds_dict_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_dict_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dict_id` INTEGER NOT NULL,
    `label` VARCHAR(50) NOT NULL,
    `value` VARCHAR(50) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tds_dict_data_dict_id_idx`(`dict_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_sys_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'string',
    `group` VARCHAR(50) NOT NULL DEFAULT 'system',
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_built_in` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tds_sys_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_user_oauths` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `provider_id` VARCHAR(100) NOT NULL,
    `union_id` VARCHAR(100) NULL,
    `access_token` VARCHAR(500) NULL,
    `refresh_token` VARCHAR(500) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tds_user_oauths_provider_provider_id_key`(`provider`, `provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tds_user_posts` ADD CONSTRAINT `tds_user_posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `tds_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tds_user_posts` ADD CONSTRAINT `tds_user_posts_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `tds_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tds_dict_data` ADD CONSTRAINT `tds_dict_data_dict_id_fkey` FOREIGN KEY (`dict_id`) REFERENCES `tds_dict_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tds_user_oauths` ADD CONSTRAINT `tds_user_oauths_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `tds_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default password policy
INSERT INTO `tds_password_policies` (`min_length`, `max_length`, `require_uppercase`, `require_lowercase`, `require_numbers`, `require_symbols`, `expiry_days`, `history_count`, `max_login_attempts`, `lockout_duration`, `created_at`, `updated_at`) 
VALUES (8, 32, true, true, true, false, 90, 5, 5, 30, NOW(), NOW());
