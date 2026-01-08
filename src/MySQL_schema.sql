-- =========================================================
-- SHAHEEN APP - UPDATED SCHEMA (ADMIN + REVIEW/PAYMENT/REFUND)
-- =========================================================

-- CREATE DATABASE shaheen_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE shaheen_app;

-- 1) Static / Lookup Tables
CREATE TABLE cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  region VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vehicle_makes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vehicle_submakes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  make_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicle_submakes_make
    FOREIGN KEY (make_id) REFERENCES vehicle_makes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vehicle_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  make_id INT NOT NULL,
  submake_id INT NOT NULL,
  model_year INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicle_variants_make
    FOREIGN KEY (make_id) REFERENCES vehicle_makes(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vehicle_variants_submake
    FOREIGN KEY (submake_id) REFERENCES vehicle_submakes(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_vehicle_variant (make_id, submake_id, model_year, name),
  INDEX idx_vehicle_variants_filter (make_id, submake_id, model_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tracker_companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_destinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  region VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Users (Customers) + OTP
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL,
  email_verified TINYINT(1) DEFAULT 0,
  email_verified_at DATETIME NULL,
  mobile VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  city_id INT NULL,
  cnic VARCHAR(25) NULL,
  cnic_expiry DATE NULL,
  dob DATE NULL,
  nationality INT NULL,
  gender ENUM('male','female','other') NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  role ENUM('customer') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_mobile (mobile),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_city
    FOREIGN KEY (city_id) REFERENCES cities(id),
  CONSTRAINT fk_users_country
    FOREIGN KEY (nationality) REFERENCES countries(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(30) NOT NULL,
  email VARCHAR(150) NULL,
  otp VARCHAR(10) NOT NULL,
  purpose ENUM('forgot_password','email_verify','login','other') DEFAULT 'forgot_password',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_mobile (mobile),
  INDEX idx_otp_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2.1) Admins (Dedicated Table - Security)
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  mobile VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,

  role ENUM('SUPER_ADMIN','OPERATIONS_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN')
    NOT NULL DEFAULT 'OPERATIONS_ADMIN',

  status ENUM('active','inactive') DEFAULT 'active',

  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_admins_email (email),
  UNIQUE KEY uq_admins_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2.2) Admin Sessions (Session + Inactivity Timeout)
CREATE TABLE admin_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,

  -- store HASH of token (never store raw token in DB)
  token_hash CHAR(64) NOT NULL,

  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- absolute expiry (example: 7 days), plus inactivity expiry in middleware
  expires_at DATETIME NOT NULL,

  revoked_at DATETIME NULL,

  UNIQUE KEY uq_admin_session_token (token_hash),
  INDEX idx_admin_sessions_admin (admin_id),
  INDEX idx_admin_sessions_exp (expires_at),

  CONSTRAINT fk_admin_sessions_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Motor Insurance Proposals (Updated lifecycle fields)
CREATE TABLE motor_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  -- Personal
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  cnic_expiry DATE NOT NULL,
  dob DATE NOT NULL,
  nationality VARCHAR(100) NULL,
  gender ENUM('male','female','other') NULL,

  -- Vehicle
  product_type ENUM('private','commercial') NOT NULL,
  registration_number VARCHAR(50) NULL,
  applied_for TINYINT(1) DEFAULT 0,
  is_owner TINYINT(1) NOT NULL,
  owner_relation ENUM('father', 'mother', 'brother', 'sister', 'spouse', 'son', 'daughter') NULL,
  engine_number VARCHAR(100) NOT NULL,
  chassis_number VARCHAR(100) NOT NULL,
  make_id INT NOT NULL,
  submake_id INT NOT NULL,
  model_year INT NOT NULL,
  assembly ENUM('local','imported') NOT NULL,
  variant_id INT NULL,
  colour VARCHAR(50) NOT NULL,
  tracker_company_id INT NULL,
  accessories_value DECIMAL(12,2) DEFAULT 0.00,

  -- Calculations
  sum_insured DECIMAL(14,2) NULL,
  premium DECIMAL(14,2) NULL,

  -- NEW: lifecycle & admin review
  submission_status ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',

  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  paid_at DATETIME NULL,

  review_status ENUM('not_applicable','pending_review','reupload_required','approved','rejected')
    NOT NULL DEFAULT 'not_applicable',

  submitted_at DATETIME NULL,
  expires_at DATETIME NULL, -- set when submitted & unpaid: NOW()+INTERVAL 7 DAY

  admin_last_action_by INT NULL,
  admin_last_action_at DATETIME NULL,

  rejection_reason TEXT NULL,

  reupload_notes TEXT NULL,
  reupload_required_docs JSON NULL,

  -- Refund workflow (only meaningful when rejected + paid)
  refund_status ENUM('not_applicable','refund_initiated','refund_processed','closed')
    NOT NULL DEFAULT 'not_applicable',

  refund_amount DECIMAL(14,2) NULL,
  refund_reference VARCHAR(100) NULL,
  refund_remarks TEXT NULL,
  refund_evidence_path VARCHAR(255) NULL,
  refund_initiated_at DATETIME NULL,
  refund_processed_at DATETIME NULL,
  closed_at DATETIME NULL,

  -- Future: policy issue module
  policy_status ENUM('not_issued','active','expired') NOT NULL DEFAULT 'not_issued',
  policy_no VARCHAR(100) NULL,
  policy_issued_at DATETIME NULL,
  policy_expires_at DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_motor_user (user_id),
  INDEX idx_motor_payment (payment_status),
  INDEX idx_motor_review (review_status),
  INDEX idx_motor_expires (expires_at),

  CONSTRAINT fk_motor_proposals_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_motor_proposals_city
    FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_motor_proposals_make
    FOREIGN KEY (make_id) REFERENCES vehicle_makes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_motor_proposals_submake
    FOREIGN KEY (submake_id) REFERENCES vehicle_submakes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_motor_proposals_variant
    FOREIGN KEY (variant_id) REFERENCES vehicle_variants(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_motor_proposals_tracker
    FOREIGN KEY (tracker_company_id) REFERENCES tracker_companies(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_motor_admin_last_action
    FOREIGN KEY (admin_last_action_by) REFERENCES admins(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE motor_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  doc_type ENUM('CNIC','DRIVING_LICENSE','REGISTRATION_BOOK') NOT NULL,
  side ENUM('front','back') NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_motor_documents_proposal_id (proposal_id),

  CONSTRAINT fk_motor_documents_proposal
    FOREIGN KEY (proposal_id) REFERENCES motor_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_motor_doc_unique (proposal_id, doc_type, side)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE motor_vehicle_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  image_type ENUM(
    'front_side','back_side','right_side','left_side',
    'dashboard','engine_bay','boot','engine_number',
    'registration_front','registration_back'
  ) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_motor_vehicle_images_proposal_id (proposal_id),

  CONSTRAINT fk_motor_vehicle_images_proposal
    FOREIGN KEY (proposal_id) REFERENCES motor_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Travel pricing catalog (unchanged)
CREATE TABLE travel_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code ENUM('DOMESTIC','HAJJ_UMRAH_ZIARAT','INTERNATIONAL','STUDENT_GUARD') NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_coverages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  code ENUM('INDIVIDUAL','FAMILY','WITH_TUITION','WITHOUT_TUITION') NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pkg_cov (package_id, code),
  CONSTRAINT fk_travel_coverages_package
    FOREIGN KEY (package_id) REFERENCES travel_packages(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  coverage_id INT NOT NULL,
  code ENUM('BASIC','SILVER','GOLD','PLATINUM','DIAMOND') NOT NULL,
  name VARCHAR(100) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PKR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plan_unique (package_id, coverage_id, code),
  CONSTRAINT fk_travel_plans_package
    FOREIGN KEY (package_id) REFERENCES travel_packages(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_travel_plans_coverage
    FOREIGN KEY (coverage_id) REFERENCES travel_coverages(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_plan_pricing_slabs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  slab_label VARCHAR(50) NOT NULL,
  min_days INT NOT NULL,
  max_days INT NOT NULL,
  is_multi_trip TINYINT(1) DEFAULT 0,
  max_trip_days INT NULL,
  premium DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plan_days (plan_id, min_days, max_days, is_multi_trip),
  CONSTRAINT fk_pricing_plan
    FOREIGN KEY (plan_id) REFERENCES travel_plans(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_package_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL UNIQUE,
  max_age INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rules_package
    FOREIGN KEY (package_id) REFERENCES travel_packages(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_age_loadings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  min_age INT NOT NULL,
  max_age INT NOT NULL,
  loading_percent INT NOT NULL,
  max_trip_days INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_age_band (package_id, min_age, max_age),
  CONSTRAINT fk_age_loadings_package
    FOREIGN KEY (package_id) REFERENCES travel_packages(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4.1) Travel proposals (same new lifecycle fields, repeated across 4 tables)
-- Helper: each travel_*_proposals includes:
-- submission_status, payment_status, review_status, expires_at, rejection_reason, refund fields, policy fields, admin last action

-- DOMESTIC
CREATE TABLE travel_domestic_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tenure_days INT NOT NULL,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  passport_number VARCHAR(50) NULL,
  mobile VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  dob DATE NOT NULL,

  beneficiary_name VARCHAR(150) NOT NULL,
  beneficiary_address VARCHAR(255) NOT NULL,
  beneficiary_cnic VARCHAR(25) NOT NULL,
  beneficiary_cnic_issue_date DATE NOT NULL,
  beneficiary_relation VARCHAR(100) NOT NULL,

  base_premium DECIMAL(14,2) NOT NULL,
  final_premium DECIMAL(14,2) NOT NULL,

  submission_status ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',

  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  paid_at DATETIME NULL,

  review_status ENUM('not_applicable','pending_review','reupload_required','approved','rejected')
    NOT NULL DEFAULT 'not_applicable',

  submitted_at DATETIME NULL,
  expires_at DATETIME NULL,

  admin_last_action_by INT NULL,
  admin_last_action_at DATETIME NULL,

  rejection_reason TEXT NULL,

  reupload_notes TEXT NULL,
  reupload_required_docs JSON NULL,

  refund_status ENUM('not_applicable','refund_initiated','refund_processed','closed')
    NOT NULL DEFAULT 'not_applicable',
  refund_amount DECIMAL(14,2) NULL,
  refund_reference VARCHAR(100) NULL,
  refund_remarks TEXT NULL,
  refund_evidence_path VARCHAR(255) NULL,
  refund_initiated_at DATETIME NULL,
  refund_processed_at DATETIME NULL,
  closed_at DATETIME NULL,

  policy_status ENUM('not_issued','active','expired') NOT NULL DEFAULT 'not_issued',
  policy_no VARCHAR(100) NULL,
  policy_issued_at DATETIME NULL,
  policy_expires_at DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dom_pay (payment_status),
  INDEX idx_dom_review (review_status),
  INDEX idx_dom_exp (expires_at),
  INDEX idx_td_created (created_at),
  INDEX idx_td_user (user_id),

  CONSTRAINT fk_domestic_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_domestic_city FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_domestic_plan FOREIGN KEY (plan_id) REFERENCES travel_plans(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_domestic_admin_last_action
    FOREIGN KEY (admin_last_action_by) REFERENCES admins(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_domestic_family_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  member_type ENUM('spouse','child','parent','other') NOT NULL DEFAULT 'other',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('male','female','other') NULL,
  cnic VARCHAR(25) NULL,
  passport_number VARCHAR(50) NULL,
  relation VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_domestic_fm_proposal FOREIGN KEY (proposal_id) REFERENCES travel_domestic_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_domestic_fm_proposal (proposal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_domestic_destinations_selected (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  destination_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_domestic_dest_proposal FOREIGN KEY (proposal_id) REFERENCES travel_domestic_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_domestic_dest_destination FOREIGN KEY (destination_id) REFERENCES travel_destinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- HAJJ/UMRAH/ZIARAT
CREATE TABLE travel_huj_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tenure_days INT NOT NULL,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  passport_number VARCHAR(50) NULL,
  mobile VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  dob DATE NOT NULL,

  beneficiary_name VARCHAR(150) NOT NULL,
  beneficiary_address VARCHAR(255) NOT NULL,
  beneficiary_cnic VARCHAR(25) NOT NULL,
  beneficiary_cnic_issue_date DATE NOT NULL,
  beneficiary_relation VARCHAR(100) NOT NULL,

  base_premium DECIMAL(14,2) NOT NULL,
  final_premium DECIMAL(14,2) NOT NULL,

  submission_status ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',
  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  paid_at DATETIME NULL,

  review_status ENUM('not_applicable','pending_review','reupload_required','approved','rejected')
    NOT NULL DEFAULT 'not_applicable',

  submitted_at DATETIME NULL,
  expires_at DATETIME NULL,

  admin_last_action_by INT NULL,
  admin_last_action_at DATETIME NULL,
  rejection_reason TEXT NULL,

  reupload_notes TEXT NULL,
  reupload_required_docs JSON NULL,

  refund_status ENUM('not_applicable','refund_initiated','refund_processed','closed')
    NOT NULL DEFAULT 'not_applicable',
  refund_amount DECIMAL(14,2) NULL,
  refund_reference VARCHAR(100) NULL,
  refund_remarks TEXT NULL,
  refund_evidence_path VARCHAR(255) NULL,
  refund_initiated_at DATETIME NULL,
  refund_processed_at DATETIME NULL,
  closed_at DATETIME NULL,

  policy_status ENUM('not_issued','active','expired') NOT NULL DEFAULT 'not_issued',
  policy_no VARCHAR(100) NULL,
  policy_issued_at DATETIME NULL,
  policy_expires_at DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_huj_pay (payment_status),
  INDEX idx_huj_review (review_status),
  INDEX idx_huj_exp (expires_at),
  INDEX idx_th_created (created_at),
  INDEX idx_th_user (user_id),

  CONSTRAINT fk_huj_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_huj_city FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_huj_plan FOREIGN KEY (plan_id) REFERENCES travel_plans(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_huj_admin_last_action
    FOREIGN KEY (admin_last_action_by) REFERENCES admins(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_huj_family_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  member_type ENUM('spouse','child','parent','other') NOT NULL DEFAULT 'other',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('male','female','other') NULL,
  cnic VARCHAR(25) NULL,
  passport_number VARCHAR(50) NULL,
  relation VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_huj_fm_proposal FOREIGN KEY (proposal_id) REFERENCES travel_huj_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_huj_fm_proposal (proposal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_huj_destinations_selected (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  destination_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_huj_dest_proposal FOREIGN KEY (proposal_id) REFERENCES travel_huj_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_huj_dest_destination FOREIGN KEY (destination_id) REFERENCES travel_destinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INTERNATIONAL
CREATE TABLE travel_international_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tenure_days INT NOT NULL,

  is_multi_trip TINYINT(1) DEFAULT 0,
  max_trip_days_applied INT NULL,
  age_loading_percent INT DEFAULT 0,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  passport_number VARCHAR(50) NULL,
  mobile VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  dob DATE NOT NULL,

  beneficiary_name VARCHAR(150) NOT NULL,
  beneficiary_address VARCHAR(255) NOT NULL,
  beneficiary_cnic VARCHAR(25) NOT NULL,
  beneficiary_cnic_issue_date DATE NOT NULL,
  beneficiary_relation VARCHAR(100) NOT NULL,

  base_premium DECIMAL(14,2) NOT NULL,
  final_premium DECIMAL(14,2) NOT NULL,

  submission_status ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',
  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  paid_at DATETIME NULL,

  review_status ENUM('not_applicable','pending_review','reupload_required','approved','rejected')
    NOT NULL DEFAULT 'not_applicable',

  submitted_at DATETIME NULL,
  expires_at DATETIME NULL,

  admin_last_action_by INT NULL,
  admin_last_action_at DATETIME NULL,
  rejection_reason TEXT NULL,

  reupload_notes TEXT NULL,
  reupload_required_docs JSON NULL,

  refund_status ENUM('not_applicable','refund_initiated','refund_processed','closed')
    NOT NULL DEFAULT 'not_applicable',
  refund_amount DECIMAL(14,2) NULL,
  refund_reference VARCHAR(100) NULL,
  refund_remarks TEXT NULL,
  refund_evidence_path VARCHAR(255) NULL,
  refund_initiated_at DATETIME NULL,
  refund_processed_at DATETIME NULL,
  closed_at DATETIME NULL,

  policy_status ENUM('not_issued','active','expired') NOT NULL DEFAULT 'not_issued',
  policy_no VARCHAR(100) NULL,
  policy_issued_at DATETIME NULL,
  policy_expires_at DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_int_pay (payment_status),
  INDEX idx_int_review (review_status),
  INDEX idx_int_exp (expires_at),
  INDEX idx_ti_created (created_at),
  INDEX idx_ti_user (user_id),

  CONSTRAINT fk_int_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_int_city FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_int_plan FOREIGN KEY (plan_id) REFERENCES travel_plans(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_int_admin_last_action
    FOREIGN KEY (admin_last_action_by) REFERENCES admins(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_international_family_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  member_type ENUM('spouse','child','parent','other') NOT NULL DEFAULT 'other',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('male','female','other') NULL,
  cnic VARCHAR(25) NULL,
  passport_number VARCHAR(50) NULL,
  relation VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_int_fm_proposal FOREIGN KEY (proposal_id) REFERENCES travel_international_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_int_fm_proposal (proposal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_international_destinations_selected (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  destination_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_int_dest_proposal FOREIGN KEY (proposal_id) REFERENCES travel_international_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_int_dest_destination FOREIGN KEY (destination_id) REFERENCES travel_destinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- STUDENT GUARD
CREATE TABLE travel_student_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tenure_days INT NOT NULL,

  university_name VARCHAR(255) NULL,

  parent_name VARCHAR(150) NULL,
  parent_address VARCHAR(255) NULL,
  parent_cnic VARCHAR(25) NULL,
  parent_cnic_issue_date DATE NULL,
  parent_relation VARCHAR(100) NULL,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  passport_number VARCHAR(50) NULL,
  mobile VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  dob DATE NOT NULL,

  beneficiary_name VARCHAR(150) NOT NULL,
  beneficiary_address VARCHAR(255) NOT NULL,
  beneficiary_cnic VARCHAR(25) NOT NULL,
  beneficiary_cnic_issue_date DATE NOT NULL,
  beneficiary_relation VARCHAR(100) NOT NULL,

  base_premium DECIMAL(14,2) NOT NULL,
  final_premium DECIMAL(14,2) NOT NULL,

  submission_status ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',
  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  paid_at DATETIME NULL,

  review_status ENUM('not_applicable','pending_review','reupload_required','approved','rejected')
    NOT NULL DEFAULT 'not_applicable',

  submitted_at DATETIME NULL,
  expires_at DATETIME NULL,

  admin_last_action_by INT NULL,
  admin_last_action_at DATETIME NULL,
  rejection_reason TEXT NULL,

  reupload_notes TEXT NULL,
  reupload_required_docs JSON NULL,

  refund_status ENUM('not_applicable','refund_initiated','refund_processed','closed')
    NOT NULL DEFAULT 'not_applicable',
  refund_amount DECIMAL(14,2) NULL,
  refund_reference VARCHAR(100) NULL,
  refund_remarks TEXT NULL,
  refund_evidence_path VARCHAR(255) NULL,
  refund_initiated_at DATETIME NULL,
  refund_processed_at DATETIME NULL,
  closed_at DATETIME NULL,

  policy_status ENUM('not_issued','active','expired') NOT NULL DEFAULT 'not_issued',
  policy_no VARCHAR(100) NULL,
  policy_issued_at DATETIME NULL,
  policy_expires_at DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_std_pay (payment_status),
  INDEX idx_std_review (review_status),
  INDEX idx_std_exp (expires_at),
  INDEX idx_ts_created (created_at),
  INDEX idx_ts_user (user_id),

  CONSTRAINT fk_std_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_std_city FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_std_plan FOREIGN KEY (plan_id) REFERENCES travel_plans(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_std_admin_last_action
    FOREIGN KEY (admin_last_action_by) REFERENCES admins(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_student_destinations_selected (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  destination_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_std_dest_proposal FOREIGN KEY (proposal_id) REFERENCES travel_student_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_std_dest_destination FOREIGN KEY (destination_id) REFERENCES travel_destinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travel_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,

  package_code ENUM('DOMESTIC','HAJJ_UMRAH_ZIARAT','INTERNATIONAL','STUDENT_GUARD') NOT NULL,
  proposal_id INT NOT NULL,

  doc_type ENUM('CNIC','PASSPORT','TICKET') NOT NULL,
  side ENUM('front','back','single') NULL,

  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_travel_docs (package_code, proposal_id, doc_type, side),
  INDEX idx_travel_docs_lookup (package_code, proposal_id, doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Payments (placeholder; keep but we’ll also keep payment_status in proposals for faster filtering)
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  application_type ENUM('MOTOR','TRAVEL') NOT NULL,
  application_subtype ENUM('DOMESTIC','HAJJ_UMRAH_ZIARAT','INTERNATIONAL','STUDENT_GUARD') NULL,
  application_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  status ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'PENDING',
  gateway VARCHAR(50) DEFAULT 'PayFast',
  order_id VARCHAR(100) NOT NULL,
  gateway_txn_id VARCHAR(100) NULL,
  raw_response JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_app (application_type, application_id),
  INDEX idx_payments_subtype (application_type, application_subtype, application_id),
  CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) Notifications / FAQs / Support
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NULL,
  is_read TINYINT(1) DEFAULT 0,
  sent_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE support_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  message TEXT NOT NULL,
  status ENUM('open','in_progress','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_requests_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7) Optional Policy / Claim Cache
CREATE TABLE policies_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  policy_no VARCHAR(100) NOT NULL,
  product VARCHAR(100) NOT NULL,
  expiry_date DATE NULL,
  status VARCHAR(50) NOT NULL,
  pdf_url VARCHAR(255) NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_policies_cache_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_policies_cache (user_id, policy_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claims_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  claim_no VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  incident_date DATE NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_cache_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_claims_cache (user_id, claim_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADMIN DASHBOARD
-- 1) Travel Admin View for Unified Proposals Inbox
CREATE OR REPLACE VIEW vw_travel_proposals_admin AS
SELECT
  'DOMESTIC' AS travel_type,
  p.id,
  p.user_id,
  p.plan_id,
  p.start_date,
  p.end_date,
  p.tenure_days,
  p.first_name,
  p.last_name,
  p.mobile,
  p.email,
  p.cnic,
  p.base_premium,
  p.final_premium,

  p.submission_status,
  p.payment_status,
  p.paid_at,

  p.review_status,
  p.submitted_at,
  p.expires_at,

  p.admin_last_action_by,
  p.admin_last_action_at,
  p.rejection_reason,

  p.reupload_notes,
  p.reupload_required_docs,

  p.refund_status,
  p.refund_amount,
  p.refund_reference,
  p.refund_initiated_at,
  p.refund_processed_at,
  p.closed_at,

  p.policy_status,
  p.policy_no,
  p.policy_issued_at,
  p.policy_expires_at,

  p.created_at,
  p.updated_at
FROM travel_domestic_proposals p

UNION ALL
SELECT
  'HAJJ_UMRAH_ZIARAT' AS travel_type,
  p.id, p.user_id, p.plan_id, p.start_date, p.end_date, p.tenure_days,
  p.first_name, p.last_name, p.mobile, p.email, p.cnic,
  p.base_premium, p.final_premium,

  p.submission_status, p.payment_status, p.paid_at,
  p.review_status, p.submitted_at, p.expires_at,
  p.admin_last_action_by, p.admin_last_action_at, p.rejection_reason,
  p.reupload_notes, p.reupload_required_docs,
  p.refund_status, p.refund_amount, p.refund_reference, p.refund_initiated_at, p.refund_processed_at, p.closed_at,
  p.policy_status, p.policy_no, p.policy_issued_at, p.policy_expires_at,
  p.created_at, p.updated_at
FROM travel_huj_proposals p

UNION ALL
SELECT
  'INTERNATIONAL' AS travel_type,
  p.id, p.user_id, p.plan_id, p.start_date, p.end_date, p.tenure_days,
  p.first_name, p.last_name, p.mobile, p.email, p.cnic,
  p.base_premium, p.final_premium,

  p.submission_status, p.payment_status, p.paid_at,
  p.review_status, p.submitted_at, p.expires_at,
  p.admin_last_action_by, p.admin_last_action_at, p.rejection_reason,
  p.reupload_notes, p.reupload_required_docs,
  p.refund_status, p.refund_amount, p.refund_reference, p.refund_initiated_at, p.refund_processed_at, p.closed_at,
  p.policy_status, p.policy_no, p.policy_issued_at, p.policy_expires_at,
  p.created_at, p.updated_at
FROM travel_international_proposals p

UNION ALL
SELECT
  'STUDENT_GUARD' AS travel_type,
  p.id, p.user_id, p.plan_id, p.start_date, p.end_date, p.tenure_days,
  p.first_name, p.last_name, p.mobile, p.email, p.cnic,
  p.base_premium, p.final_premium,

  p.submission_status, p.payment_status, p.paid_at,
  p.review_status, p.submitted_at, p.expires_at,
  p.admin_last_action_by, p.admin_last_action_at, p.rejection_reason,
  p.reupload_notes, p.reupload_required_docs,
  p.refund_status, p.refund_amount, p.refund_reference, p.refund_initiated_at, p.refund_processed_at, p.closed_at,
  p.policy_status, p.policy_no, p.policy_issued_at, p.policy_expires_at,
  p.created_at, p.updated_at
FROM travel_student_proposals p;
