CREATE DATABASE Support_db;
-- evrything has been commented out to ensure the query does not repeat itself
USE Support_db;
-- creates table for instructor and attributes
CREATE TABLE Company (
    company_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100)
    -- credits_earned INT DEFAULT 0
);
CREATE TABLE Agent (
    agent_id INT PRIMARY KEY AUTO_INCREMENT,
    agent_name INT,
    agent_status VARCHAR(100)
);
CREATE TABLE Administration (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_name VARCHAR(100),
    admin_field VARCHAR(100)
);
CREATE TABLE Message (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    message_createdON DATETIME,
    message_createBY VARCHAR(100),
    message_ticket INT,
    TextBox VARCHAR(500)
);
-- creates table for course and attributes
CREATE TABLE Tickets (
    ticket_id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_type VARCHAR(100),
    ticket_status VARCHAR(100),
    ticket_description VARCHAR(100),
    ticket_createdON DATETIME,
    ticket_createBY VARCHAR(100),
    Agent_id INT,
    ticket_updatedON DATETIME,
    -- one to many relationship between tickets and agents
    FOREIGN KEY (Agent_id) REFERENCES Agent(agent_id),
    -- one to many relationship between tickets and users
	FOREIGN KEY (ticket_createBY) REFERENCES Customer(user_id),
    -- one to many relationship betwen tickets and messages
    FOREIGN KEY (ticket_createBY) REFERENCES Message(message_createBY),
    FOREIGN KEY (ticket_id) REFERENCES Message(message_ticket)
    
);
CREATE TABLE Customer (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    user_email VARCHAR(100),
    user_phone VARCHAR(100),
    user_password VARCHAR(100),
    user_affilliation VARCHAR(100) UNIQUE,
    user_role VARCHAR(100),
    -- one to many relationship between users and company name
    FOREiGN KEY (user_affiliation) REFERENCES Company(name)
		ON DELETE CASCADE,
	-- users can be actual customers, agents, and admins
    FOREIGN KEY (user_role) REFERENCES Agent(agent_id),
    FOREIGN KEY (user_role) REFERENCES Administration(admin_id),
	FOREIGN KEY (user_role) REFERENCES Customer(user_id)
);
-- creates final table for enrollment and attributes

CREATE TABLE Support (
    -- support database should have tables with tickets, users, admin, ect 
    FOREIGN KEY (user_role) REFERENCES Customer(user_id)
    /*PRIMARY KEY (customer_id, company_id),
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (user_role) REFERENCES Customer(user_id)*/
);
-- insert parents of database
/*INSERT INTO Instructor (instructor_name, instructor_id, department) 
VALUES ('Jim George', 535, 'Software');

INSERT INTO Student (student_id, name, credits_earned) VALUES (387 ,'John Walker', 93);

INSERT INTO Course (course_id, course_title, instructor_id) 
VALUES (9076,'Software Enginerring', 535);*/

