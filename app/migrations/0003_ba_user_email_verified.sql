-- Mark OAuth users as email-verified so implicit account linking works
UPDATE f2w_ba_user
SET emailVerified = 1
WHERE emailVerified = 0
  AND id IN (SELECT DISTINCT userId FROM f2w_account WHERE providerId LIKE 'cognito-%');
