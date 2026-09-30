const {
    createUser
} = require("./auth");

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.log(
        "Usage: node src/create-user.js <username> <password>"
    );
    process.exit(1);
}

try {

    const id = createUser(
        username,
        password
    );

    console.log(
        `User created successfully. ID: ${id}`
    );

} catch (error) {

    console.error(
        "Error:",
        error.message
    );

    process.exit(1);
}
