-- Server-side quiz sessions and attempts (prevents client-side score forgery)
CREATE TABLE IF NOT EXISTS `QuizSessions` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `language` varchar(50) NOT NULL,
  `level` int(11) NOT NULL,
  `question_ids` longtext NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_quiz_sessions_user` (`user_id`),
  KEY `idx_quiz_sessions_expires` (`expires_at`),
  CONSTRAINT `QuizSessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `QuizAttempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(36) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer` char(1) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quiz_attempt` (`session_id`, `question_id`),
  KEY `idx_quiz_attempts_session` (`session_id`),
  CONSTRAINT `QuizAttempts_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `QuizSessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `QuizAttempts_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `QuizQuestions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
