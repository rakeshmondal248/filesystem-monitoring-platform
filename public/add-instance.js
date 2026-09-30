async function addInstance() {
    const resultElement =
        document.getElementById("result");

    try {
        const instanceId =
            document
                .getElementById("instanceId")
                .value
                .trim();

        const name =
            document
                .getElementById("name")
                .value
                .trim();

        if (!instanceId) {
            resultElement.textContent =
                "Error: AWS EC2 Instance ID is required.";

            return;
        }

        if (!name) {
            resultElement.textContent =
                "Error: Instance Name is required.";

            return;
        }

        resultElement.textContent =
            "Creating monitoring instance...";

        const response =
            await fetch(
                "/api/instances",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        instanceId: instanceId,
                        name: name
                    })
                }
            );

        const data =
            await response.json();

        resultElement.textContent =
            JSON.stringify(
                data,
                null,
                2
            );

    } catch (error) {

        resultElement.textContent =
            "Error: " +
            error.message;
    }
}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const createButton =
            document.getElementById(
                "createButton"
            );

        if (createButton) {

            createButton.addEventListener(
                "click",
                addInstance
            );
        }
    }
);
