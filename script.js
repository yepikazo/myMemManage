// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Active nav link on scroll
// const sections = document.querySelectorAll("section[id]");
// const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= sectionTop - 200) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
});

// CTA Buttons functionality: separate handlers for primary and about
const startCta = document.getElementById("start-cta");
const aboutBtn = document.getElementById("about-btn");

if (startCta) {
  startCta.addEventListener("click", () => {
    const preview = document.querySelector(".s2");
    if (preview) {
      preview.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (aboutBtn) {
  aboutBtn.addEventListener("click", () => {
    const aboutSection = document.querySelector(".about-section");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

// Material card selection
const materialCards = document.querySelectorAll(".material-card");
const materialButtons = document.querySelectorAll(".material-button");

materialButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    const card = button.closest(".material-card");
    const materialType = card.getAttribute("data-material");

    // Add selection animation
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
      card.style.transform = "";
    }, 200);

    // Here you can add navigation to the material page
    console.log(`Selected material: ${materialType}`);
    // window.location.href = `${materialType}.html`;
  });
});

// Add parallax effect to banner shapes
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const shapes = document.querySelectorAll(".shape");

  shapes.forEach((shape, index) => {
    const speed = 0.5 + index * 0.2;
    shape.style.transform = `translateY(${scrolled * speed}px) rotate(${
      scrolled * 0.1
    }deg)`;
  });
});

// Add hover effect to developer cards
const developerCards = document.querySelectorAll(".developer-card");
developerCards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    card.style.transition = "transform 0.3s ease";
  });
});

// Navbar scroll effect
// let lastScroll = 0;
// const navbar = document.querySelector(".navbar");

// window.addEventListener("scroll", () => {
//   const currentScroll = window.pageYOffset;

//   if (currentScroll > 100) {
//     navbar.style.boxShadow = "0 6px 25px rgba(0, 0, 0, 0.4)";
//   } else {
//     navbar.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
//   }

//   lastScroll = currentScroll;
// });

/* Content preview / isi interaktif: simple pager for preview materi */
(function () {
  const pages = [
    {
      id: "contiguous",
      title: "CONTIGUOUS MEMORY ALOCATION",
      desc: "Salah satu metode manajemen memori paling dasar: setiap proses mendapatkan satu blok memori tunggal yang berkelanjutan. Metode ini sederhana namun rentan fragmentasi dan pemborosan ruang memori.",
      startHref: "contiguous.html",
    },
    {
      id: "non-contiguous",
      title: "NON-CONTIGUOUS MEMORY ALLOCATION",
      desc: "Alokasi non-berurutan memungkinkan sebuah proses menggunakan beberapa blok memori yang terpisah—lebih fleksibel namun membutuhkan mekanisme pengelolaan tambahan seperti tabel atau mapping.",
      startHref: "noncontiguous.html",
    },
  ];

  let currentIndex = 0;

  const titleEl = document.getElementById("h2title");
  const descEl = document.getElementById("h2deskripsi");
  const indicatorEl = document.getElementById("page-indicator");
  const prevBtn = document.getElementById("content-prev");
  const nextBtn = document.getElementById("content-next");
  const startBtn = document.getElementById("start-btn");
  const simBtn = document.getElementById("sim-btn");
  const latBtn = document.getElementById("lat-btn");

  function showPage(index) {
    if (index < 0) index = pages.length - 1;
    if (index >= pages.length) index = 0;
    currentIndex = index;

    const p = pages[currentIndex];
    // text update
    if (titleEl) titleEl.textContent = p.title;
    if (descEl) descEl.textContent = p.desc;
    if (indicatorEl)
      indicatorEl.textContent = `${currentIndex + 1} / ${pages.length}`;

    // enable/disable action buttons depending on the current material
    try {
      if (simBtn) {
        if (p && p.id === "contiguous") {
          simBtn.disabled = false;
          simBtn.title = "Buka Simulasi";
          simBtn.classList.remove("disabled");
        } else {
          simBtn.disabled = true;
          simBtn.title = "Simulasi tidak tersedia untuk materi ini";
          simBtn.classList.add("disabled");
        }
      }
      if (latBtn) {
        if (p && p.id === "contiguous") {
          latBtn.disabled = false;
          latBtn.title = "Buka Latihan";
          latBtn.classList.remove("disabled");
        } else {
          latBtn.disabled = true;
          latBtn.title = "Latihan tidak tersedia untuk materi ini";
          latBtn.classList.add("disabled");
        }
      }
    } catch (e) {
      // ignore UI toggle errors
    }

    // small animation (fade)
    const card = document.getElementById("content-card");
    if (card) {
      card.style.opacity = 0.02;
      card.style.transform = "translateY(8px)";
      setTimeout(() => {
        card.style.transition = "all 260ms ease";
        card.style.opacity = 1;
        card.style.transform = "";
      }, 60);
    }
  }

  if (prevBtn)
    prevBtn.addEventListener("click", () => showPage(currentIndex - 1));
  if (nextBtn)
    nextBtn.addEventListener("click", () => showPage(currentIndex + 1));

  // keyboard support
  window.addEventListener("keydown", (e) => {
    if (
      document.activeElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
    )
      return;
    if (e.key === "ArrowRight") showPage(currentIndex + 1);
    if (e.key === "ArrowLeft") showPage(currentIndex - 1);
  });

  // action buttons (default: navigate to anchor or console log). Adjust to your routing.
  if (startBtn)
    startBtn.addEventListener("click", () => {
      const p = pages[currentIndex];
      if (!p || !p.startHref) return;
      // If startHref is an in-page anchor (starts with '#'), attempt smooth scroll.
      if (p.startHref.startsWith("#")) {
        const target = document.querySelector(p.startHref);
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Otherwise navigate to the given page (same-origin path assumed)
      window.location.href = p.startHref;
    });

  if (simBtn)
    simBtn.addEventListener("click", () => {
      // Only navigate when the preview currently shows the contiguous material
      const p = pages[currentIndex];
      if (p && p.id === "contiguous") {
        window.location.href = "contiguous.html#visualization";
      } else{
        window.location.href = "noncontiguous.html#visualization";
      }
      // otherwise do nothing (button is disabled via showPage)
    });

  if (latBtn)
    latBtn.addEventListener("click", () => {
      // Only navigate when the preview currently shows the contiguous material
      const p = pages[currentIndex];
      if (p && p.id === "contiguous") {
        window.location.href = "contiguous-practice.html";
      } else{
        window.location.href = "noncontiguous-practice.html";

      }
    });

  // init
  showPage(0);
})();
