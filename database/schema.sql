-- ============================================================================
-- Bangladesh Smart Travel Planner & Tour Agent Management System
-- Complete Normalized MySQL 8.0+ Schema
-- ============================================================================

CREATE DATABASE IF NOT EXISTS bd_smart_travel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bd_smart_travel;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS booking_status_histories;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS travel_plan_items;
DROP TABLE IF EXISTS travel_plans;
DROP TABLE IF EXISTS tour_package_items;
DROP TABLE IF EXISTS tour_packages;
DROP TABLE IF EXISTS additional_expenses;
DROP TABLE IF EXISTS food_costs;
DROP TABLE IF EXISTS hotel_room_types;
DROP TABLE IF EXISTS hotels;
DROP TABLE IF EXISTS transport_options;
DROP TABLE IF EXISTS agent_availabilities;
DROP TABLE IF EXISTS agent_destinations;
DROP TABLE IF EXISTS tourist_attractions;
DROP TABLE IF EXISTS destinations;
DROP TABLE IF EXISTS agent_profiles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('tourist', 'agent', 'admin') NOT NULL DEFAULT 'tourist',
    status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB;

-- 2. AGENT PROFILES
CREATE TABLE agent_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    agency_name VARCHAR(160) NOT NULL,
    bio TEXT,
    license_number VARCHAR(80),
    profile_image VARCHAR(255) DEFAULT '/images/default-agent.png',
    base_service_fee_bdt DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
    max_group_capacity INT UNSIGNED NOT NULL DEFAULT 10,
    tour_types VARCHAR(255) NOT NULL DEFAULT 'Family, Group, Adventure',
    services_offered VARCHAR(255) NOT NULL DEFAULT 'Guide, Local Transport, Hotel Booking',
    languages_spoken VARCHAR(180) NOT NULL DEFAULT 'Bengali, English',
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    rating_avg DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    review_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_agent_fee_capacity (base_service_fee_bdt, max_group_capacity)
) ENGINE=InnoDB;

-- 3. DESTINATIONS
CREATE TABLE destinations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    slug VARCHAR(140) NOT NULL UNIQUE,
    division VARCHAR(80) NOT NULL,
    landscape_type ENUM('Beach', 'Hill Tract', 'Mangrove Forest', 'Tea Garden & Haor', 'Heritage & Cultural', 'Island', 'Urban') NOT NULL,
    short_description VARCHAR(255) NOT NULL,
    detailed_description TEXT NOT NULL,
    best_time_to_visit VARCHAR(120) DEFAULT 'November to March',
    travel_notes TEXT,
    image_url VARCHAR(255) DEFAULT '/images/default-destination.jpg',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dest_active_featured (is_active, is_featured)
) ENGINE=InnoDB;

-- 4. TOURIST ATTRACTIONS
CREATE TABLE tourist_attractions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    destination_id INT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Sightseeing',
    description TEXT,
    entrance_fee_bdt DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    estimated_duration_hours DECIMAL(4, 1) DEFAULT 2.0,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attraction_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    INDEX idx_attraction_dest (destination_id, is_active)
) ENGINE=InnoDB;

-- 5. AGENT DESTINATIONS (Many-to-Many with optional custom fee per destination)
CREATE TABLE agent_destinations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_profile_id INT UNSIGNED NOT NULL,
    destination_id INT UNSIGNED NOT NULL,
    custom_service_fee_bdt DECIMAL(10, 2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_agent_dest (agent_profile_id, destination_id),
    CONSTRAINT fk_ad_agent FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ad_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. AGENT AVAILABILITIES
CREATE TABLE agent_availabilities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_profile_id INT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('available', 'unavailable', 'booked') NOT NULL DEFAULT 'available',
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_avail_agent FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_avail_dates CHECK (end_date >= start_date),
    INDEX idx_agent_avail_range (agent_profile_id, status, start_date, end_date)
) ENGINE=InnoDB;

-- 7. TRANSPORT OPTIONS
CREATE TABLE transport_options (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transport_type ENUM('bus', 'train', 'private_car', 'launch', 'flight', 'other') NOT NULL,
    departure_location VARCHAR(100) NOT NULL,
    destination_id INT UNSIGNED NOT NULL,
    operator_name VARCHAR(140) NOT NULL,
    comfort_tier ENUM('budget', 'standard', 'premium') NOT NULL DEFAULT 'standard',
    pricing_model ENUM('per_person', 'per_vehicle') NOT NULL DEFAULT 'per_person',
    vehicle_capacity INT UNSIGNED NOT NULL DEFAULT 1,
    one_way_fare_bdt DECIMAL(10, 2) NOT NULL,
    return_fare_bdt DECIMAL(10, 2) DEFAULT NULL,
    duration_hours DECIMAL(5, 2) DEFAULT NULL,
    schedule_info VARCHAR(255) DEFAULT 'Multiple daily departures',
    additional_fees_bdt DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transport_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    INDEX idx_transport_lookup (departure_location, destination_id, transport_type, is_active)
) ENGINE=InnoDB;

-- 8. HOTELS
CREATE TABLE hotels (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    destination_id INT UNSIGNED NOT NULL,
    name VARCHAR(160) NOT NULL,
    category ENUM('budget', 'standard', 'premium') NOT NULL DEFAULT 'standard',
    address VARCHAR(255) NOT NULL,
    facilities VARCHAR(255) DEFAULT 'Wi-Fi, AC/Non-AC, Restaurant',
    check_in_time VARCHAR(30) DEFAULT '12:00 PM',
    check_out_time VARCHAR(30) DEFAULT '11:00 AM',
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_hotel_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    INDEX idx_hotel_dest_cat (destination_id, category, is_active)
) ENGINE=InnoDB;

-- 9. HOTEL ROOM TYPES
CREATE TABLE hotel_room_types (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT UNSIGNED NOT NULL,
    room_type_name VARCHAR(120) NOT NULL,
    price_per_night_bdt DECIMAL(10, 2) NOT NULL,
    max_guests_per_room INT UNSIGNED NOT NULL DEFAULT 2,
    available_rooms_count INT UNSIGNED NOT NULL DEFAULT 10,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_room_price (hotel_id, price_per_night_bdt, is_active)
) ENGINE=InnoDB;

-- 10. FOOD COSTS
CREATE TABLE food_costs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    destination_id INT UNSIGNED NOT NULL,
    tier ENUM('budget', 'standard', 'premium') NOT NULL DEFAULT 'standard',
    package_name VARCHAR(120) NOT NULL DEFAULT 'Standard Local Meal Plan',
    breakfast_cost_bdt DECIMAL(10, 2) NOT NULL,
    lunch_cost_bdt DECIMAL(10, 2) NOT NULL,
    dinner_cost_bdt DECIMAL(10, 2) NOT NULL,
    snacks_water_cost_bdt DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dest_food_tier (destination_id, tier),
    CONSTRAINT fk_food_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. ADDITIONAL EXPENSES (Local Transport, Guide, Boat Trips, Parking, Misc)
CREATE TABLE additional_expenses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    destination_id INT UNSIGNED NOT NULL,
    expense_category ENUM('local_transport', 'guide_fee', 'boat_trip', 'activity', 'parking', 'misc', 'contingency') NOT NULL,
    title VARCHAR(150) NOT NULL,
    pricing_basis ENUM('per_person_per_day', 'per_person_flat', 'per_group_per_day', 'per_group_flat') NOT NULL DEFAULT 'per_person_per_day',
    cost_bdt DECIMAL(10, 2) NOT NULL,
    is_mandatory TINYINT(1) NOT NULL DEFAULT 1,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_add_exp_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    INDEX idx_add_exp_dest (destination_id, expense_category, is_active)
) ENGINE=InnoDB;

-- 12. TOUR PACKAGES
CREATE TABLE tour_packages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_profile_id INT UNSIGNED DEFAULT NULL,
    destination_id INT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    duration_days INT UNSIGNED NOT NULL,
    nights INT UNSIGNED NOT NULL,
    base_price_per_person_bdt DECIMAL(10, 2) NOT NULL,
    max_travelers INT UNSIGNED NOT NULL DEFAULT 15,
    accommodation_category ENUM('budget', 'standard', 'premium') NOT NULL DEFAULT 'standard',
    transport_type ENUM('bus', 'train', 'private_car', 'launch', 'flight', 'other') NOT NULL DEFAULT 'bus',
    description TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pkg_agent FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_pkg_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. TOUR PACKAGE ITEMS
CREATE TABLE tour_package_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tour_package_id INT UNSIGNED NOT NULL,
    item_type ENUM('transport', 'hotel', 'food', 'activity', 'guide', 'other') NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    is_included TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_pkg_item_pkg FOREIGN KEY (tour_package_id) REFERENCES tour_packages(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. TRAVEL PLANS (User Saved & Generated Itineraries)
CREATE TABLE travel_plans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED DEFAULT NULL,
    plan_title VARCHAR(180) NOT NULL,
    starting_location VARCHAR(100) NOT NULL,
    destination_id INT UNSIGNED NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    duration_days INT UNSIGNED NOT NULL,
    hotel_nights INT UNSIGNED NOT NULL,
    adults_count INT UNSIGNED NOT NULL DEFAULT 1,
    children_count INT UNSIGNED NOT NULL DEFAULT 0,
    total_travelers INT UNSIGNED NOT NULL DEFAULT 1,
    total_budget_bdt DECIMAL(12, 2) NOT NULL,
    preferred_transport ENUM('bus', 'train', 'private_car', 'launch', 'flight', 'other') NOT NULL,
    accommodation_category ENUM('budget', 'standard', 'premium') NOT NULL,
    food_preference ENUM('budget', 'standard', 'premium') NOT NULL DEFAULT 'standard',
    group_type ENUM('solo', 'family', 'friends', 'group') NOT NULL DEFAULT 'friends',
    requires_guide TINYINT(1) NOT NULL DEFAULT 0,
    additional_requirements TEXT,
    transportation_cost_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    accommodation_cost_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    food_cost_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    local_transport_cost_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    activity_cost_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    agent_fee_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    misc_cost_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_estimated_cost_bdt DECIMAL(12, 2) NOT NULL,
    cost_per_traveler_bdt DECIMAL(12, 2) NOT NULL,
    budget_difference_bdt DECIMAL(12, 2) NOT NULL,
    fits_budget TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('draft', 'saved', 'booked') NOT NULL DEFAULT 'saved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_plan_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    INDEX idx_plan_user (user_id, created_at)
) ENGINE=InnoDB;

-- 15. TRAVEL PLAN ITEMS (Detailed Line-by-Line Expense Breakdown)
CREATE TABLE travel_plan_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    travel_plan_id INT UNSIGNED NOT NULL,
    cost_component ENUM('transportation', 'accommodation', 'food', 'local_transport', 'activity', 'agent_fee', 'additional') NOT NULL,
    item_title VARCHAR(180) NOT NULL,
    unit_price_bdt DECIMAL(10, 2) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    multiplier_days_or_nights INT UNSIGNED NOT NULL DEFAULT 1,
    subtotal_bdt DECIMAL(12, 2) NOT NULL,
    calculation_formula VARCHAR(255) NOT NULL,
    is_verified_price TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_plan_item_plan FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. BOOKINGS
CREATE TABLE bookings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(40) NOT NULL UNIQUE,
    tourist_user_id INT UNSIGNED NOT NULL,
    agent_profile_id INT UNSIGNED NOT NULL,
    travel_plan_id INT UNSIGNED DEFAULT NULL,
    destination_id INT UNSIGNED NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    travelers_count INT UNSIGNED NOT NULL,
    agreed_agent_fee_bdt DECIMAL(10, 2) NOT NULL,
    estimated_trip_cost_bdt DECIMAL(12, 2) NOT NULL,
    special_requests TEXT,
    status ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    confirmed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_tourist FOREIGN KEY (tourist_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_agent FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_plan FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE SET NULL,
    CONSTRAINT fk_booking_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    CONSTRAINT chk_booking_dates CHECK (return_date >= departure_date),
    INDEX idx_booking_agent_dates (agent_profile_id, status, departure_date, return_date)
) ENGINE=InnoDB;

-- 17. BOOKING STATUS HISTORIES
CREATE TABLE booking_status_histories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNSIGNED NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id INT UNSIGNED NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bsh_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_bsh_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. REVIEWS
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNSIGNED NOT NULL UNIQUE,
    tourist_user_id INT UNSIGNED NOT NULL,
    agent_profile_id INT UNSIGNED NOT NULL,
    destination_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_tourist FOREIGN KEY (tourist_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_agent FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;