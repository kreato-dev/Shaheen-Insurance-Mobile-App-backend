-- Make sure you are using your DB first
-- CREATE DATABASE shaheen_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE shaheen_app;

-- 1. Static / Lookup Tables
CREATE TABLE cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
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

-- 2. Users & Auth

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL,
  mobile VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  city_id INT NULL,
  cnic VARCHAR(25) NULL,
  cnic_expiry DATE NULL,
  dob DATE NULL,
  nationality VARCHAR(100) NULL,
  gender ENUM('male','female','other') NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_mobile (mobile),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_city
    FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(30) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  purpose ENUM('forgot_password','login','other') DEFAULT 'forgot_password',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Motor Insurance

CREATE TABLE motor_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  -- Personal details
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  cnic_expiry DATE NOT NULL,
  dob DATE NOT NULL,
  nationality VARCHAR(100) NULL,
  gender ENUM('male','female','other') NULL,

  -- Vehicle details
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
  colour VARCHAR(50) NOT NULL,
  tracker_company_id INT NULL,
  accessories_value DECIMAL(12,2) DEFAULT 0.00,

  -- Calculations
  sum_insured DECIMAL(14,2) NULL,
  premium DECIMAL(14,2) NULL,

  status ENUM('draft','submitted','paid','cancelled') DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

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
  CONSTRAINT fk_motor_proposals_tracker
    FOREIGN KEY (tracker_company_id) REFERENCES tracker_companies(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  -- motor proposal documnent images
CREATE TABLE motor_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  doc_type ENUM('CNIC','DRIVING_LICENSE','REGISTRATION_BOOK') NOT NULL,
  side ENUM('front','back') NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_motor_documents_proposal
    FOREIGN KEY (proposal_id) REFERENCES motor_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_motor_doc_unique (proposal_id, doc_type, side)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  -- motor vehicle images
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
  CONSTRAINT fk_motor_vehicle_images_proposal
    FOREIGN KEY (proposal_id) REFERENCES motor_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Travel Insurance

CREATE TABLE travel_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  -- Plan / trip details
  package_type VARCHAR(50) NOT NULL, -- Worldwide / Student / Domestic etc.
  product_plan VARCHAR(100) NULL,
  coverage_type ENUM('individual','family') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tenure_days INT NOT NULL,
  sum_insured DECIMAL(14,2) NULL,
  add_ons_selected TINYINT(1) DEFAULT 0,

  -- Applicant info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city_id INT NOT NULL,
  cnic VARCHAR(25) NOT NULL,
  passport_number VARCHAR(50) NULL,
  mobile VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  dob DATE NOT NULL,
  is_student TINYINT(1) DEFAULT 0,
  university_name VARCHAR(255) NULL,

  -- Parent info (for student)
  parent_name VARCHAR(150) NULL,
  parent_address VARCHAR(255) NULL,
  parent_cnic VARCHAR(25) NULL,
  parent_cnic_issue_date DATE NULL,
  parent_relation VARCHAR(100) NULL,

  -- Beneficiary info
  beneficiary_name VARCHAR(150) NOT NULL,
  beneficiary_address VARCHAR(255) NOT NULL,
  beneficiary_cnic VARCHAR(25) NOT NULL,
  beneficiary_cnic_issue_date DATE NOT NULL,
  beneficiary_relation VARCHAR(100) NOT NULL,

  -- Premiums
  base_premium DECIMAL(14,2) NULL,
  add_ons_premium DECIMAL(14,2) NULL,
  final_premium DECIMAL(14,2) NULL,

  status ENUM('draft','submitted','paid','cancelled') DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_travel_proposals_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_travel_proposals_city
    FOREIGN KEY (city_id) REFERENCES cities(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  -- Applicant Family info (for coverageType= family i.e spouse/child(s))
CREATE TABLE travel_family_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  member_type ENUM('spouse','child','parent','other') NOT NULL DEFAULT 'other',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('male','female','other') NULL,
  cnic VARCHAR(25) NULL,
  passport_number VARCHAR(50) NULL,
  relation VARCHAR(100) NULL, -- optional free text ("Wife", "Son", etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_travel_family_members_proposal
    FOREIGN KEY (proposal_id) REFERENCES travel_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_travel_family_members_proposal (proposal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE travel_destinations_selected (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  destination_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_travel_dest_sel_proposal
    FOREIGN KEY (proposal_id) REFERENCES travel_proposals(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_travel_dest_sel_destination
    FOREIGN KEY (destination_id) REFERENCES travel_destinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Payments

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  application_type ENUM('MOTOR','TRAVEL') NOT NULL,
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
  CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Notifications / FAQs / Support (for SOW support + notifications)   

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

-- 7. Optional Policy / Claim Cache (for My Policy / My Claim)

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
