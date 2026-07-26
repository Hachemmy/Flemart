-- Quiz Tables

-- Table: QuizQuestions
CREATE TABLE IF NOT EXISTS `QuizQuestions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `language` varchar(50) NOT NULL,
  `difficulty_level` int(11) NOT NULL COMMENT '1-100',
  `question` text NOT NULL,
  `option_a` varchar(500) NOT NULL,
  `option_b` varchar(500) NOT NULL,
  `option_c` varchar(500) NOT NULL,
  `option_d` varchar(500) NOT NULL,
  `correct_answer` enum('a','b','c','d') NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_lang_level` (`language`, `difficulty_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: QuizProgress
CREATE TABLE IF NOT EXISTS `QuizProgress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `language` varchar(50) NOT NULL,
  `current_level` int(11) DEFAULT 1,
  `completed_levels` int(11) DEFAULT 0 COMMENT 'nombre de niveaux completes',
  `total_xp_earned` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_lang` (`user_id`, `language`),
  CONSTRAINT `QuizProgress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
