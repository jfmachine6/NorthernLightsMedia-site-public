const isPictionaryPage = window.location.pathname.toLowerCase().includes("/pictionary/");
const homePrefix = isPictionaryPage ? "../" : "";
const navItems = [
  { label: "About", href: `${homePrefix}index.html#about` },
  { label: "3D Pictionary", href: `${homePrefix}Pictionary/index.html` },
];

function renderNavbar(container) {
  container.innerHTML = `
    <nav class="site-nav" aria-label="Main navigation">
      <a class="site-nav__logo" href="${homePrefix}index.html" aria-label="Northern Lights Media home">
        <img src="${homePrefix}Assets/NLM_Logo_A_Bordered.png" alt="Northern Lights Media" />
      </a>
      <button class="site-nav__toggle" type="button" aria-expanded="false" aria-controls="site-menu">
        <span class="sr-only">Toggle navigation</span>
        <span></span><span></span>
      </button>
      <div class="site-nav__menu" id="site-menu">
        ${navItems.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
           <div class="site-nav__join-group">
             <a class="site-nav__join" href="https://myengagement.nku.edu/NLM/club_signup" target="_blank" rel="noopener noreferrer">Join the club <span aria-hidden="true">↗</span></a>
             <img class="site-nav__join-qr" src="${homePrefix}Assets/NLM_join_club_mystudentengagement_qrcode.jfif" alt="QR code to join Northern Lights Media" />
           </div>
      </div>
    </nav>
  `;

  const toggle = container.querySelector(".site-nav__toggle");
  const menu = container.querySelector(".site-nav__menu");
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    menu.classList.toggle("is-open", !isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
    });
  });
}

const navContainer = document.querySelector("#site-nav");
if (navContainer) {
  renderNavbar(navContainer);
}

export { renderNavbar };