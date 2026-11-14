-- Remove levels 51-100 where they duplicate the level 1-50 question set.
-- The application only serves levels 1-50 (MAX_LEVEL = 50).
DELETE q
FROM `QuizQuestions` q
JOIN `QuizQuestions` base
  ON base.`language` = q.`language`
 AND base.`difficulty_level` = q.`difficulty_level` - 50
 AND base.`question` = q.`question`
WHERE q.`difficulty_level` > 50;
