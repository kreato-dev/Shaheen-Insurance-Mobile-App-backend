/* =========================================================
   SEED PACKAGES
   ========================================================= */
INSERT INTO travel_packages (code, name) VALUES
('DOMESTIC','Domestic'),
('HAJJ_UMRAH_ZIARAT','Hajj, Umrah & Ziarat'),
('INTERNATIONAL','International'),
('STUDENT_GUARD','Student Guard')
ON DUPLICATE KEY UPDATE name=VALUES(name);

/* =========================================================
   SEED COVERAGES (per package)
   ========================================================= */
-- DOMESTIC: INDIVIDUAL + FAMILY
INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'INDIVIDUAL', 'Individual' FROM travel_packages p WHERE p.code='DOMESTIC'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'FAMILY', 'Family' FROM travel_packages p WHERE p.code='DOMESTIC'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- HUJ: INDIVIDUAL + FAMILY
INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'INDIVIDUAL', 'Individual' FROM travel_packages p WHERE p.code='HAJJ_UMRAH_ZIARAT'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'FAMILY', 'Family' FROM travel_packages p WHERE p.code='HAJJ_UMRAH_ZIARAT'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- INTERNATIONAL: INDIVIDUAL + FAMILY
INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'INDIVIDUAL', 'Individual' FROM travel_packages p WHERE p.code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'FAMILY', 'Family' FROM travel_packages p WHERE p.code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- STUDENT: WITH_TUITION + WITHOUT_TUITION
INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'WITH_TUITION', 'With Tuition Fee' FROM travel_packages p WHERE p.code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_coverages (package_id, code, name)
SELECT p.id, 'WITHOUT_TUITION', 'Without Tuition Fee' FROM travel_packages p WHERE p.code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE name=VALUES(name);

/* =========================================================
   SEED PLANS (per package+coverage)
   ========================================================= */

-- DOMESTIC plans: GOLD, PLATINUM for INDIVIDUAL & FAMILY
INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'GOLD', 'Gold'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='DOMESTIC'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'PLATINUM', 'Platinum'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='DOMESTIC'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- HUJ plans: SILVER, GOLD for INDIVIDUAL & FAMILY
INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'SILVER', 'Silver'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='HAJJ_UMRAH_ZIARAT'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'GOLD', 'Gold'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='HAJJ_UMRAH_ZIARAT'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- INTERNATIONAL plans: BASIC, SILVER, GOLD, DIAMOND for INDIVIDUAL & FAMILY
INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'BASIC', 'Basic'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'SILVER', 'Silver'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'GOLD', 'Gold'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'DIAMOND', 'Diamond'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('INDIVIDUAL','FAMILY')
WHERE p.code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- STUDENT plans: SILVER, GOLD, DIAMOND, PLATINUM for WITH_TUITION & WITHOUT_TUITION
INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'SILVER', 'Silver'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('WITH_TUITION','WITHOUT_TUITION')
WHERE p.code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'GOLD', 'Gold'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('WITH_TUITION','WITHOUT_TUITION')
WHERE p.code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'DIAMOND', 'Diamond'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('WITH_TUITION','WITHOUT_TUITION')
WHERE p.code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO travel_plans (package_id, coverage_id, code, name)
SELECT p.id, c.id, 'PLATINUM', 'Platinum'
FROM travel_packages p
JOIN travel_coverages c ON c.package_id=p.id AND c.code IN ('WITH_TUITION','WITHOUT_TUITION')
WHERE p.code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE name=VALUES(name);

/* =========================================================
   RULES SEED
   ========================================================= */
-- Max age limits:
-- Domestic: 60
-- HUJ: 69
-- International: 80
-- Student: 65
INSERT INTO travel_package_rules (package_id, max_age)
SELECT id, 60 FROM travel_packages WHERE code='DOMESTIC'
ON DUPLICATE KEY UPDATE max_age=VALUES(max_age);

INSERT INTO travel_package_rules (package_id, max_age)
SELECT id, 69 FROM travel_packages WHERE code='HAJJ_UMRAH_ZIARAT'
ON DUPLICATE KEY UPDATE max_age=VALUES(max_age);

INSERT INTO travel_package_rules (package_id, max_age)
SELECT id, 80 FROM travel_packages WHERE code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE max_age=VALUES(max_age);

INSERT INTO travel_package_rules (package_id, max_age)
SELECT id, 65 FROM travel_packages WHERE code='STUDENT_GUARD'
ON DUPLICATE KEY UPDATE max_age=VALUES(max_age);

-- International age loadings + multi-trip per-trip restriction (90 days) for those bands
INSERT INTO travel_age_loadings (package_id, min_age, max_age, loading_percent, max_trip_days)
SELECT id, 66, 70, 100, 90 FROM travel_packages WHERE code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE loading_percent=VALUES(loading_percent), max_trip_days=VALUES(max_trip_days);

INSERT INTO travel_age_loadings (package_id, min_age, max_age, loading_percent, max_trip_days)
SELECT id, 71, 75, 150, 90 FROM travel_packages WHERE code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE loading_percent=VALUES(loading_percent), max_trip_days=VALUES(max_trip_days);

INSERT INTO travel_age_loadings (package_id, min_age, max_age, loading_percent, max_trip_days)
SELECT id, 76, 80, 200, 90 FROM travel_packages WHERE code='INTERNATIONAL'
ON DUPLICATE KEY UPDATE loading_percent=VALUES(loading_percent), max_trip_days=VALUES(max_trip_days);

/* =========================================================
   PRICING SLABS SEED
   NOTE:
   - min_days/max_days mapping based on brochure labels.
   - For "Up to 7 days" => 6-7 (assuming 1-2 and 3-5 already cover earlier days).
   - International: week/month mapped to day ranges.
   - Student 6/12 months mapped to ranges (1-184) and (185-366) to tolerate real date variance.
   ========================================================= */

-- Helper concept:
-- slab insert format:
-- INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
-- SELECT tp.id, 'label', min, max, isMulti, maxTrip, premium
-- FROM travel_plans tp
-- JOIN travel_packages p ON p.id=tp.package_id AND p.code='...'
-- JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='...'
-- WHERE tp.code='...';




/* =========================
   I) DOMESTIC (Individual + Family)
   Plans: GOLD, PLATINUM
========================= */
-- Individual - GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1-2 days', 1, 2, 0, NULL, 115
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3-5 days', 3, 5, 0, NULL, 220
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 7 days', 6, 7, 0, NULL, 285
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '8-14 days', 8, 14, 0, NULL, 575
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '15-21 days', 15, 21, 0, NULL, 865
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '22-30 days', 22, 30, 0, NULL, 1150
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

-- Individual - PLATINUM
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1-2 days', 1, 2, 0, NULL, 195
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3-5 days', 3, 5, 0, NULL, 355
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 7 days', 6, 7, 0, NULL, 520
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '8-14 days', 8, 14, 0, NULL, 1045
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '15-21 days', 15, 21, 0, NULL, 1575
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '22-30 days', 22, 30, 0, NULL, 2100
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='PLATINUM';

-- Family = same premiums (GOLD/PLATINUM)
-- Family - GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1-2 days', 1, 2, 0, NULL, 115
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3-5 days', 3, 5, 0, NULL, 220
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 7 days', 6, 7, 0, NULL, 285
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '8-14 days', 8, 14, 0, NULL, 575
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '15-21 days', 15, 21, 0, NULL, 865
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '22-30 days', 22, 30, 0, NULL, 1150
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

-- Family - PLATINUM
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1-2 days', 1, 2, 0, NULL, 195
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3-5 days', 3, 5, 0, NULL, 355
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 7 days', 6, 7, 0, NULL, 520
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '8-14 days', 8, 14, 0, NULL, 1045
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '15-21 days', 15, 21, 0, NULL, 1575
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '22-30 days', 22, 30, 0, NULL, 2100
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='DOMESTIC'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='PLATINUM';



/* =========================
   II) HUJ (Individual + Family)
   Plans: SILVER, GOLD
========================= */
-- Individual SILVER
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 15 days', 1, 15, 0, NULL, 260
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '16-30 days', 16, 30, 0, NULL, 525
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '31-45 days', 31, 45, 0, NULL, 735
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';

-- Individual GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 15 days', 1, 15, 0, NULL, 500
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '16-30 days', 16, 30, 0, NULL, 1000
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '31-45 days', 31, 45, 0, NULL, 1420
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

-- Family SILVER
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 15 days', 1, 15, 0, NULL, 420
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '16-30 days', 16, 30, 0, NULL, 840
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '31-45 days', 31, 45, 0, NULL, 1180
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';

-- Family GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, 'Up to 15 days', 1, 15, 0, NULL, 800
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '16-30 days', 16, 30, 0, NULL, 1600
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '31-45 days', 31, 45, 0, NULL, 2275
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='HAJJ_UMRAH_ZIARAT'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';



/* =========================
   III) INTERNATIONAL
   Plans: DIAMOND, GOLD, SILVER, BASIC
   Coverage: INDIVIDUAL + FAMILY
========================= */

-- INDIVIDUAL BASIC
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 1835
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 2625
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 3280
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 4200
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 5645
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 6960
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 8405
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 9850
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 11560
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

-- 1 year multi-trip
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 15110
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='BASIC';

-- INDIVIDUAL SILVER
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 785
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 1375
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 1935
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 2460
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 4790
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 6975
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 9155
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 11335
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 13520
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 14450
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='SILVER';

-- INDIVIDUAL GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 4595
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 7815
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 11230
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 15270
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 25100
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 38365
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 32715
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 42045
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 49930
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 21020
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='GOLD';

-- INDIVIDUAL DIAMOND
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 5975
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 9525
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 13400
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 18000
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 30875
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 46645
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 40735
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 49930
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 60445
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 30220
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='INDIVIDUAL'
WHERE tp.code='DIAMOND';


/* FAMILY pricing (International) */
-- FAMILY BASIC
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 3020
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 3545
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 4860
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 5975
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 7290
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 8800
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 9985
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 10705
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 12810
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 20365
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='BASIC';

-- FAMILY SILVER
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 1770
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 2790
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 4070
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 4970
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 10375
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 15635
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 20890
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 26145
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 31270
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 28905
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='SILVER';

-- FAMILY GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 5090
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 8800
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 12085
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 14975
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 30220
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 45330
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 60445
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 75555
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 90670
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 34160
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='GOLD';

-- FAMILY DIAMOND
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 week', 1, 7, 0, NULL, 6830
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 weeks', 8, 14, 0, NULL, 11690
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 weeks', 15, 21, 0, NULL, 16030
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 month', 22, 30, 0, NULL, 20365
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '2 months', 31, 60, 0, NULL, 40735
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '3 months', 61, 90, 0, NULL, 60445
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '4 months', 91, 120, 0, NULL, 81470
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '5 months', 121, 150, 0, NULL, 101180
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 151, 180, 0, NULL, 122205
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '1 year multi-trip', 365, 365, 1, 90, 48355
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='INTERNATIONAL'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='FAMILY'
WHERE tp.code='DIAMOND';



/* =========================
   IV) STUDENT GUARD
   Coverage: WITH_TUITION / WITHOUT_TUITION
   Plans: SILVER, GOLD, DIAMOND, PLATINUM
========================= */

-- WITH_TUITION (6 months & 12 months)
-- SILVER
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 14450
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='SILVER';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 22335
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='SILVER';

-- GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 19050
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 29565
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='GOLD';

-- DIAMOND
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 29890
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='DIAMOND';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 45660
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='DIAMOND';

-- PLATINUM
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 180, 184, 0, NULL, 51900
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 70300
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITH_TUITION'
WHERE tp.code='PLATINUM';


-- WITHOUT_TUITION (6 months & 12 months)
-- SILVER
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 12480
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='SILVER';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 19380
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='SILVER';

-- GOLD
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 15765
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='GOLD';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 24965
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='GOLD';

-- DIAMOND
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 24635
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='DIAMOND';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 38760
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='DIAMOND';

-- PLATINUM
INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '6 months', 1, 184, 0, NULL, 44020
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='PLATINUM';

INSERT INTO travel_plan_pricing_slabs (plan_id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium)
SELECT tp.id, '12 months', 185, 366, 0, NULL, 59785
FROM travel_plans tp
JOIN travel_packages p ON p.id=tp.package_id AND p.code='STUDENT_GUARD'
JOIN travel_coverages c ON c.id=tp.coverage_id AND c.code='WITHOUT_TUITION'
WHERE tp.code='PLATINUM';