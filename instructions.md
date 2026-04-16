Build the website for Resource Management and Access Control System with Integrated Web-based Emulators. Use the oop folder the build the back end using springboot. Build the entire front end using react, create a new project for the front end using react vite.

Make the theme of the website dark and modern, with blue as the primary color. Don't keep the backgroun pure balck, use a medium-dark greyish blue background. Keep gradients wherever necessary (like on buttons).

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