-- Add github_token column to Users table
-- Required for GitHub OAuth login flow

ALTER TABLE `Users`
  ADD COLUMN `github_token` varchar(500) DEFAULT NULL AFTER `github_id`;
