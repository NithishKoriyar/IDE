export const SQL_STARTER_TEMPLATE = `CREATE TABLE Users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    age INTEGER
);

INSERT INTO Users (name, age)
VALUES ('John', 25);

SELECT * FROM Users;
`
