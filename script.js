const navToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

navToggle.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  nav.classList.toggle("is-open", !isOpen);
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  }
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

document.querySelectorAll(".menu-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.filter;
    document.querySelectorAll(".menu-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll(".dish-card").forEach((card) => {
      card.classList.toggle("is-hidden", filter !== "all" && card.dataset.category !== filter);
    });
  });
});

const shortlist = new Set();
const shortlistButton = document.querySelector("#shortlist-button");
const shortlistCount = document.querySelector("#shortlist-count");
const shortlistDialog = document.querySelector("#shortlist-dialog");
const shortlistItems = document.querySelector("#shortlist-items");
const shortlistEmpty = document.querySelector(".shortlist-empty");
const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function renderShortlist() {
  shortlistItems.replaceChildren();
  shortlist.forEach((dish) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const remove = document.createElement("button");
    name.textContent = dish;
    remove.className = "remove-dish";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${dish} from shortlist`);
    remove.addEventListener("click", () => {
      shortlist.delete(dish);
      renderShortlist();
    });
    item.append(name, remove);
    shortlistItems.append(item);
  });
  shortlistCount.textContent = String(shortlist.size);
  shortlistButton.hidden = shortlist.size === 0;
  shortlistEmpty.hidden = shortlist.size !== 0;
}

document.querySelectorAll(".add-dish").forEach((button) => {
  button.addEventListener("click", () => {
    const dish = button.dataset.dish;
    if (shortlist.has(dish)) {
      showToast(`${dish} is already on your shortlist`);
      return;
    }
    shortlist.add(dish);
    renderShortlist();
    showToast(`${dish} added to your shortlist`);
  });
});

shortlistButton.addEventListener("click", () => shortlistDialog.showModal());
document.querySelector(".dialog-close").addEventListener("click", () => shortlistDialog.close());
document.querySelector(".dialog-book").addEventListener("click", () => shortlistDialog.close());
shortlistDialog.addEventListener("click", (event) => {
  if (event.target === shortlistDialog) shortlistDialog.close();
});

const dateInput = document.querySelector("#booking-date");
dateInput.min = new Date().toISOString().slice(0, 10);
document.querySelector("#booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector("#form-feedback");
  const submitButton = form.querySelector("[type='submit']");
  const formData = new FormData(form);
  const reservation = Object.fromEntries(formData.entries());
  const date = new Date(`${reservation.date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });

  feedback.textContent = "Saving your reservation request...";
  submitButton.disabled = true;

  fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reservation)
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your request.");
      return result;
    })
    .then(() => {
      const message = `Hello ZanziTürk Restaurant, I submitted reservation request ${reservation.name}. Party size: ${reservation.guests}. Date: ${date}. Email: ${reservation.email}.`;
      feedback.replaceChildren();
      feedback.append("Request saved. ");
      const whatsappLink = document.createElement("a");
      whatsappLink.href = `https://wa.me/255675101453?text=${encodeURIComponent(message)}`;
      whatsappLink.target = "_blank";
      whatsappLink.rel = "noopener noreferrer";
      whatsappLink.textContent = "Send it on WhatsApp";
      feedback.append(whatsappLink);
      form.reset();
      dateInput.min = new Date().toISOString().slice(0, 10);
    })
    .catch((error) => {
      feedback.textContent = `${error.message} Please try again or contact us on WhatsApp.`;
    })
    .finally(() => {
      submitButton.disabled = false;
    });
});

document.querySelector("#year").textContent = String(new Date().getFullYear());