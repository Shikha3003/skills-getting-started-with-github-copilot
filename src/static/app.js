document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantListItem(participant, activityName) {
    const listItem = document.createElement("li");
    listItem.className = "participant-item";
    listItem.dataset.email = participant;

    const email = document.createElement("span");
    email.className = "participant-email";
    email.textContent = participant;
    listItem.appendChild(email);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-participant";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Unregister ${participant} from ${activityName}`);
    removeButton.title = "Unregister participant";
    removeButton.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    `;
    listItem.appendChild(removeButton);

    return listItem;
  }

  function updateActivityAvailability(activityCard) {
    const availability = activityCard.querySelector(".activity-availability");
    const participantsCount = activityCard.querySelectorAll(".participant-item").length;
    const maxParticipants = Number(availability.dataset.maxParticipants);
    availability.querySelector(".spots-left").textContent =
      `${maxParticipants - participantsCount} spots left`;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.querySelectorAll("option:not(:first-child)").forEach((option) => {
        option.remove();
      });

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability" data-max-participants="${details.max_participants}">
            <strong>Availability:</strong> <span class="spots-left">${spotsLeft} spots left</span>
          </p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants:";
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((participant) => {
          participantsList.appendChild(createParticipantListItem(participant, name));
        });
        participantsSection.appendChild(participantsList);

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "No participants yet.";
          participantsSection.appendChild(emptyMessage);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) {
      return;
    }

    const listItem = removeButton.closest(".participant-item");
    const activityCard = removeButton.closest(".activity-card");
    const email = listItem.dataset.email;
    const activity = activityCard.dataset.activityName;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        messageDiv.textContent = result.detail || "Unable to unregister participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        return;
      }

      listItem.remove();
      if (activityCard.querySelectorAll(".participant-item").length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "participants-empty";
        emptyMessage.textContent = "No participants yet.";
        activityCard.querySelector(".participants").appendChild(emptyMessage);
      }
      updateActivityAvailability(activityCard);

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
