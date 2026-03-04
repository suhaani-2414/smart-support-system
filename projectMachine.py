#program uses datatbase in mysql to insert records
import mysql.connector
def submit_ticket(student_id, course_id, grade):
    #connect to mysql
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="@_Scptiku68675",
            database="support_db"
        )
        cursor = conn.cursor()

        # call query to sql to insert ticket into support table
        query = "INSERT INTO Support (ticket_id, user_id, message) VALUES (%s, %s, %s)"
        # data = (ticket_id, user_id, message)
        # call execute to execute query in sql server
        #cursor.execute(query, data)
        conn.commit()
        print("ticket enrolled successfully!")
    # if error happens, print error
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    #close connection to mysql server
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


# student ifnormation below is a duplicate--enforces referential intergerty by calling an error message
