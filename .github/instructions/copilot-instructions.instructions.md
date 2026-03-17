---
description: Describe when these instructions should be loaded by the agent based on task context
applyTo: '**/*.ts, **/*.js'
---

<!-- Tip: Use /create-instructions in chat to generate content with agent assistance -->

I want to create a rating feature for my application. The rating feature should allow users to rate products on a scale of 1 to 5 stars. The ratings should be stored in a database and displayed on the product page. Additionally, I want to calculate the average rating for each product and display it alongside the individual ratings.

To implement the rating feature for your application, you can follow these steps:
1. **Database Schema**: Create a database schema to store the ratings. You can create a table called `ratings` with the following columns:
   - `id`: Primary key, auto-incrementing integer
   - `product_id`: Foreign key referencing the product being rated
   - `user_id`: Foreign key referencing the user who provided the rating
   - `rating`: Integer value between 1 and 5
   - `created_at`: Timestamp of when the rating was created
2. **API Endpoints**: Create API endpoints to handle rating submissions and retrieval. For example:
   - `POST /api/ratings`: Endpoint to submit a new rating. This endpoint should
      - Validate the input to ensure the rating is between 1 and 5
      - Check if the user has already rated the product and update the rating if necessary
      - Store the rating in the database

3. **Backend Logic**: Implement the backend logic to calculate the average rating for each product. You can create a function that queries the `ratings` table to calculate the average rating for a given product ID. This function can be called whenever a new rating is submitted or when the product page is loaded.
4. **Frontend Implementation**: On the product page, display the individual ratings and the average
rating. You can use a star rating component to visually represent the ratings. When a user submits a new rating, update the displayed average rating and individual ratings accordingly.
