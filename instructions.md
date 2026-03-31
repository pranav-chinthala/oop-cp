Build the website for Resource Management and Access Control System with Integrated Web-based Emulators. Use the oop folder the build the back end using springboot. Build the entire front end using react, create a new project for the front end using react vite.

Make the theme of the website dark and modern, with blue as the primary color. Don't keep the backgroun pure balck, use a medium-dark greyish blue background. Keep gradients wherever necessary (like on buttons).

# Suggested Schema

CREATE TABLE users (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    name VARCHAR(100) NOT NULL UNIQUE,  
    email VARCHAR(255) NOT NULL UNIQUE,  
    password\_hash VARCHAR(255) NOT NULL,  
    added\_by INT,  
    added\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    FOREIGN KEY (added\_by) REFERENCES users(id) ON DELETE SET NULL  
);

CREATE TABLE access\_requests (  
    id INT,  
    requested\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    access BOOLEAN DEFAULT false,   
)

CREATE TABLE super\_admins (  
    user\_id INT PRIMARY KEY,  
    super\_admin\_since TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    made\_super\_admin\_by INT,  
    status ENUM('Active', 'Role Changed', 'Resigned'),  
    FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE,  
    FOREIGN KEY (made\_super\_admin\_by) REFERENCES users(id)  
);

CREATE TABLE project\_managers (  
    user\_id INT PRIMARY KEY,  
    pm\_since TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    status ENUM('Active', 'Role Changed', 'Resigned'),  
    added\_by INT,  
    FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE,  
    FOREIGN KEY (added\_by) REFERENCES super\_admins(user\_id) ON DELETE SET NULL  
);

CREATE TABLE projects (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    name VARCHAR(255) NOT NULL,  
    description TEXT,  
    status ENUM('Initiated', 'In Progress', 'Finished', 'Cancelled'),  
    created\_by INT NOT NULL,  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    finished\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    cancelled\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    FOREIGN KEY (created\_by) REFERENCES project\_managers(user\_id) ON DELETE RESTRICT  
);

CREATE TABLE project\_members (  
    project\_id INT NOT NULL,  
    user\_id INT NOT NULL,  
    role ENUM('Manager', 'Member') NOT NULL DEFAULT 'Member',  
    added\_by INT NOT NULL,   
    added\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    PRIMARY KEY (project\_id, user\_id),  
    FOREIGN KEY (project\_id) REFERENCES projects(id) ON DELETE CASCADE,  
    FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE,  
    FOREIGN KEY (added\_by) REFERENCES users(id) ON DELETE RESTRICT  
);

CREATE TABLE resources (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    project\_id INT NOT NULL,  
    name VARCHAR(255) NOT NULL,  
    resource\_type VARCHAR(100),  
    status ENUM('Provisioned', 'Maintenance', 'Decommissioned') DEFAULT 'Provisioned',  
    created\_by INT NOT NULL,  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    FOREIGN KEY (project\_id) REFERENCES projects(id) ON DELETE CASCADE,  
    FOREIGN KEY (created\_by) REFERENCES users(id) ON DELETE RESTRICT  
);

CREATE TABLE resource\_services (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    resource\_id INT NOT NULL,  
    service\_protocol VARCHAR(50) NOT NULL,  
    ip\_address VARCHAR(45) NOT NULL,  
    port INT NOT NULL,  
    connection\_metadata JSON,  
    FOREIGN KEY (resource\_id) REFERENCES resources(id) ON DELETE CASCADE  
);

CREATE TABLE resource\_permissions (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    resource\_id INT NOT NULL,  
    user\_id INT NOT NULL,  
    can\_access BOOLEAN DEFAULT TRUE,   
    can\_grant\_access BOOLEAN DEFAULT FALSE,   
    granted\_by INT NOT NULL,  
    granted\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    UNIQUE KEY unique\_user\_resource (resource\_id, user\_id),  
    FOREIGN KEY (resource\_id) REFERENCES resources(id) ON DELETE CASCADE,  
    FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE,  
    FOREIGN KEY (granted\_by) REFERENCES users(id) ON DELETE RESTRICT  
);

CREATE TABLE resource\_credentials (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    resource\_service\_id INT NOT NULL UNIQUE,  
    auth\_method ENUM('Password', 'SSH\_Key', 'Token') NOT NULL,  
    username VARCHAR(100) NOT NULL,  
    encrypted\_secret TEXT NOT NULL,  
    updated\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    FOREIGN KEY (resource\_service\_id) REFERENCES resource\_services(id) ON DELETE CASCADE  
);

CREATE TABLE access\_requests (  
    id INT AUTO\_INCREMENT PRIMARY KEY,  
    user\_id INT NOT NULL,  
    resource\_id INT NOT NULL,  
    request\_reason TEXT NOT NULL,  
    status ENUM('Pending', 'Approved', 'Rejected', 'Revoked') DEFAULT 'Pending',  
    requested\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    reviewed\_by INT,  
    reviewed\_at TIMESTAMP NULL,  
    rejection\_reason TEXT,  
    FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE,  
    FOREIGN KEY (resource\_id) REFERENCES resources(id) ON DELETE CASCADE,  
    FOREIGN KEY (reviewed\_by) REFERENCES users(id) ON DELETE SET NULL  
);

# Rules For the site.

Login Page:  
Ask email and password, validate and let in.

If the user is present in the super admins table, they'll see the super admin version of the site. Else if they are in the project managers table, they'll see the project managers version of the site. Else, they'll see the employee version of the site.

Request Access Page: User should input values in the following fields:

- Name  
- Email  
- Create Password  
- Confirm Password

On clicking the "Request" button, the user should see a green tick animation with the message "Access requested successfully". 

If the user gets access, he'll be able to login the next time he tries to login, else he'll see "Access not granted yet" or "Access denied".

## Super Admin Site

Super admin will have the following tabs in the sidebar:

- Dashboard: An overview of the number of projects, number of project managers, number of employees, number of resources–out of those the number of provisioned, active, and decommissioned resources.  
- Users: This tab will have the following sections:  
  - Pending Access Requests: List of all the access requests sent, with "Grant" and "Deny" buttons. This section should have a "Show All" button after 5 requests so that the page doesn't get crowded.  
  - Super Admins: List of all the super admins. Each super admin row will show their name, super admin since since, and a delete icon. On clicking on a profile, we see the same information with extra information like the users they accepted the request for, the users they removed, the projects they created, etc. basically all the change logs. The profile section will also have the Account thumbnail of the super admin that added them. This thumbnail will take you to the super admin's profile.  
  - Project Managers: List of all the project managers. This section will have 3 horizontal tabs: "Active PMs", "Past PMs", and "removed PMs". Each PM row will show their name, PM since, and a delete icon. On clicking on a profile, we see the same information with extra information like their current project (in progress), upcoming projects (initiated), and past projects (finished and cancelled). Each project card will take you to it's main page when clicked on it. The PM's profile page will also have buttons saying "Change Role" (to change to super admin or employee), and "Remove" (remove). The profile section will also have the Account thumbnail of the super admin that added them. This thumbnail will take you to the super admin's profile.  
  - Employees: List of all the employees. Each row will show their name, employee since, and a delete icon. On clicking on a profile, we see the same information with extra information like their current project (in progress), upcoming projects (initiated), and past projects (finished and cancelled). Each project card will take you to its main page when clicked on it. The employee's profile page will also have buttons saying "Make "Change Role" (to change to project manager or super admin), and "Remove" (remove). The profile section will also have the Account thumbnail of the super admin that added them. This thumbnail will take you to the super admin's profile.  
- Projects:  
  - Super admins can see a list of projects. One clicking on a project, it takes them to the project page which shows all the information about the project like the Project managers, the members, when it was created, who created it, what's the current status, the resources that were created for it (clicking on these should redirect the user to the resource info page), etc. In the project members section, they should have a button to add a member existing in the database to the project (searching by email, use pattern matching)., remove a member from the project (each member will have a delete icon next to it for doing this.)  
- Resources: This page will show list of all the resources grouped by project, along with its status and the date it was created. On clicking a resource, it's redirected to the resource info page, where super admins can see all the information like the port numbers, ip address, services running on each port, access credentials (only visible to super admins) who created it, which users have access to it, which users can grant access to it. Note: All the users in a project have access to all resources in their project by default. Project managers and super admins can grant others access outside the project, and super admins can authorize people to let them be able to give others access. Also, the info page will show all the APIs on that server for super admins and project managers. Project managers and super admins can create new API end points, and can check a checkbox during creation to let all people in the project have access to it. They should also be able to manually give access to endpoints after creation (even people not from the project). People can also click on a API endpoint and directly jump into the HTTP client emulator with the endpoint details and key pre filled in. Keys will be taken during creation.  
- HTTP Client: HTTP emulator like Postman or Swagger UI. Use [Java.net](http://Java.net) package for the implementation.  
- SSH Terminal: Web based SSH simulator (functional) using sockets. Use [Java.net](http://Java.net) package for the implementation.

Account Thumbnail (at the bottom)  
Sign Out button.

## Project Managers Site

Project manager will have the following tabs in the sidebar:

- Dashboard; Everything will be the same as the admin version, except this will only show the stats the project manager is/was/will be a part of.  
- Project Members: Will only should members of their project, grouped by project, rest all remains the same. (cannot grant access to the while site by accepting requests like super admins).  
- Projects: Will show them the projects they are part of only. Rest is the same as super admin.  
- Will only show the resources part of their project or that they have access to.  
- Resources: Mostly remains the same.  
- HTTP Client: Same  
- SSH Terminal: Same

Account Thumbnail (at the bottom)  
Sign Out button.

## Employee Site.

This will be almost the same as the project manager, except that they cannot create projects, etc.

Make reasonable logical changes in the database schema or rules wherever necessary to make the system robust.