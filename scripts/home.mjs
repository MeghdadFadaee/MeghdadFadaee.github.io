import { escapeHtml, serializeJsonForHtml } from "./text.mjs";
import { localeAbsoluteUrl, localeRoot } from "./site-config.mjs";

function alternates(site, pagePath = null) {
    const links = site.locales.map((locale) => {
        const href = pagePath ? new URL(`${localeRoot(locale)}${pagePath}`, site.url).href : localeAbsoluteUrl(site, locale);
        return `    <link rel="alternate" hreflang="${escapeHtml(locale.code)}" href="${escapeHtml(href)}">`;
    });
    const fallback = site.locales.find((locale) => locale.code === site.defaultLocale);
    const xDefault = pagePath ? new URL(`${localeRoot(fallback)}${pagePath}`, site.url).href : localeAbsoluteUrl(site, fallback);
    links.push(`    <link rel="alternate" hreflang="x-default" href="${escapeHtml(xDefault)}">`);
    return links.join("\n");
}

function renderLanguageLinks(site, current, aria, pagePath = null) {
    return site.locales.filter((locale) => locale.code !== current.code).map((locale) => {
        const href = pagePath ? `${localeRoot(locale)}${pagePath}` : localeRoot(locale);
        return `<a class="nes-btn language-switcher" hreflang="${escapeHtml(locale.code)}" lang="${escapeHtml(locale.code)}" dir="${escapeHtml(locale.direction)}" href="${escapeHtml(href)}" aria-label="${escapeHtml(aria)}">${escapeHtml(locale.nativeName)}</a>`;
    }).join("\n");
}

function renderSchema(site, locale, home) {
    const pageUrl = localeAbsoluteUrl(site, locale);
    const rootUrl = localeAbsoluteUrl(site, site.locales.find((item) => item.code === site.defaultLocale));
    return serializeJsonForHtml({
        "@context": "https://schema.org",
        "@graph": [
            { "@type": "WebSite", "@id": `${rootUrl}#website`, url: rootUrl, name: home.profile.siteName, alternateName: home.profile.alternateName, inLanguage: locale.code, publisher: { "@id": `${rootUrl}#person` } },
            { "@type": "ProfilePage", "@id": `${pageUrl}#profile`, url: pageUrl, name: home.seo.title, inLanguage: locale.code, isPartOf: { "@id": `${rootUrl}#website` }, mainEntity: { "@id": `${rootUrl}#person` } },
            { "@type": "Person", "@id": `${rootUrl}#person`, name: home.profile.name, jobTitle: home.profile.jobTitle, url: rootUrl, sameAs: ["https://github.com/MeghdadFadaee", "https://t.me/MeghdadFadaee"], image: `${site.url}assets/preview.png`, description: home.profile.description }
        ]
    });
}

function head(site, locale, home) {
    const pageUrl = localeAbsoluteUrl(site, locale);
    const image = `${site.url}assets/og-preview.png`;
    const otherOg = site.locales.filter((item) => item.code !== locale.code).map((item) => `    <meta property="og:locale:alternate" content="${escapeHtml(item.ogLocale)}">`).join("\n");
    return `    <title>${escapeHtml(home.seo.title)}</title>
    <meta name="description" content="${escapeHtml(home.seo.description)}">
    <meta name="author" content="${escapeHtml(home.profile.name)}">
    <meta name="google-site-verification" content="r7GnylOYawm7Ty0cNnZlbeQyRgX1pTOStpal1n-G9fw">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#212529">
    <link rel="canonical" href="${escapeHtml(pageUrl)}">
${alternates(site)}
    <meta property="og:title" content="${escapeHtml(home.seo.title)}">
    <meta property="og:description" content="${escapeHtml(home.seo.socialDescription)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="${escapeHtml(home.seo.imageAlt)}">
    <meta property="og:url" content="${escapeHtml(pageUrl)}"><meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeHtml(home.profile.siteName)}"><meta property="og:locale" content="${escapeHtml(locale.ogLocale)}">
${otherOg}
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(home.seo.title)}">
    <meta name="twitter:description" content="${escapeHtml(home.seo.socialDescription)}"><meta name="twitter:image" content="${escapeHtml(image)}">
    <meta name="twitter:image:alt" content="${escapeHtml(home.seo.imageAlt)}">`;
}

function body(site, locale, home, cards) {
    const root = localeRoot(locale);
    const n = home.navigation;
    const terminalLines = home.terminal.initialLines.map((line) => `<p dir="auto">${escapeHtml(line)}</p>`).join("\n                ");
    const skills = home.stats.skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("\n                            ");
    const languageLinks = renderLanguageLinks(site, locale, n.languageAria);
    return `<a href="#main-content" class="skip-link">${escapeHtml(n.skip)}</a>
<header class="sticky top-0 z-50"><nav class="site-nav p-4 bg-[#212529] border-b-4 border-white" aria-label="${escapeHtml(n.primaryAria)}">
 <div class="container mx-auto flex justify-between items-center gap-3"><a href="${escapeHtml(root)}#hero" class="text-[#209cee] site-brand" aria-label="${escapeHtml(n.homeAria)}"><i class="nes-icon coin is-small" aria-hidden="true"></i> ${escapeHtml(home.profile.name)}</a>
 <div class="nav-actions"><div class="hidden md:flex nav-page-links"><a href="${escapeHtml(root)}#about" class="nes-btn is-primary">${escapeHtml(n.stats)}</a><a href="${escapeHtml(root)}#projects" class="nes-btn is-success">${escapeHtml(n.quests)}</a><a href="${escapeHtml(root)}#contact" class="nes-btn is-warning">${escapeHtml(n.connect)}</a></div>${languageLinks}</div></div>
</nav></header>
<main id="main-content" class="container mx-auto px-4 mt-12 space-y-20">
 <section id="hero" class="flex flex-col items-center justify-center min-h-[60vh]">
  <div class="nes-balloon ${locale.direction === "rtl" ? "from-right" : "from-left"} mb-8 text-black"><p>${escapeHtml(home.hero.greeting)}</p></div><i class="nes-octocat animate float-anim" aria-hidden="true"></i>
  <div class="text-center max-w-4xl mt-8 hero-copy"><p class="section-kicker">${escapeHtml(home.hero.playerLabel)}</p><h1 class="text-3xl md:text-5xl text-white leading-relaxed">${escapeHtml(home.hero.name)}</h1><p class="text-base md:text-xl text-[#209cee] mt-4 leading-relaxed">${escapeHtml(home.hero.jobTitle)}</p></div>
  <div class="nes-container is-dark with-title w-full max-w-4xl terminal-panel"><h2 class="title">${escapeHtml(home.terminal.title)}</h2>
   <div id="terminal-output" class="mb-4 text-green-400 text-sm md:text-base font-mono h-48 overflow-y-auto" role="log" aria-live="polite" aria-label="${escapeHtml(home.terminal.outputAria)}">${terminalLines}<br></div>
   <div class="flex flex-col sm:flex-row sm:items-center gap-2" dir="ltr"><span class="text-blue-400 text-xs whitespace-nowrap">${escapeHtml(home.terminal.prompt)}</span><label for="terminal-input" class="sr-only">${escapeHtml(home.terminal.inputLabel)}</label><input type="text" id="terminal-input" class="bg-transparent border-none outline-none text-white w-full min-w-0 flex-1 font-mono" autocomplete="off" spellcheck="false" aria-describedby="terminal-hint"></div>
  </div><p id="terminal-hint" class="text-xs text-gray-400 mt-2 text-center mobile-hint">${escapeHtml(home.terminal.hint)}</p>
 </section>
 <section id="about" class="pt-8"><div class="nes-container with-title is-dark"><h2 class="title">${escapeHtml(home.stats.title)}</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
  <div class="text-center"><div class="inline-block p-4 border-4 border-white mb-4"><i class="nes-icon is-large star" aria-hidden="true"></i></div><h3 class="text-xl text-[#e76e55]">${escapeHtml(home.stats.role)}</h3><p class="text-xs text-gray-400 mt-2">${escapeHtml(home.stats.level)}</p>
   <div class="mt-6 stats-bars space-y-4 max-w-xs mx-auto"><div><label for="hp-stat" class="text-xs">${escapeHtml(home.stats.hp)}</label><progress id="hp-stat" class="nes-progress is-error" value="90" max="100">90%</progress></div><div><label for="mp-stat" class="text-xs">${escapeHtml(home.stats.mp)}</label><progress id="mp-stat" class="nes-progress is-primary" value="85" max="100">85%</progress></div><div><label for="exp-stat" class="text-xs">${escapeHtml(home.stats.exp)}</label><progress id="exp-stat" class="nes-progress is-success" value="60" max="100">60%</progress></div></div>
  </div><div><p class="mb-4 text-[#f7d51d]">${escapeHtml(home.stats.skillsTitle)}</p><div class="lists"><ul class="nes-list is-disc">${skills}</ul></div><div class="mt-6 p-4 bg-[#212529] border-4 border-[#92cc41]"><p class="text-[#92cc41] leading-7">${escapeHtml(home.stats.quote)}</p></div></div>
 </div></div></section>
 <section id="projects" class="pt-8"><div class="flex items-center mb-8 section-title-row"><i class="nes-icon trophy is-large" aria-hidden="true"></i><h2 class="text-2xl">${escapeHtml(home.projects.title)}</h2></div><div id="project-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${cards}</div></section>
 <section id="contact" class="pt-16 pb-16"><div class="nes-container with-title is-center"><h2 class="title">${escapeHtml(home.contact.title)}</h2><p class="mb-8 leading-7">${escapeHtml(home.contact.intro)}</p>
  <div class="flex justify-center gap-6 flex-wrap"><a href="https://github.com/MeghdadFadaee" class="nes-btn" target="_blank" rel="noopener noreferrer"><i class="nes-icon github is-small" aria-hidden="true"></i> GitHub</a><a href="https://t.me/MeghdadFadaee" class="nes-btn is-primary" target="_blank" rel="noopener noreferrer"><i class="fab fa-telegram" aria-hidden="true"></i> Telegram</a><a href="tel:09359484943" class="nes-btn is-success"><i class="fas fa-phone" aria-hidden="true"></i> ${escapeHtml(home.contact.call)}</a><a href="mailto:MeghdadFadaee@gmail.com" class="nes-btn is-error"><i class="nes-icon gmail is-small" aria-hidden="true"></i> ${escapeHtml(home.contact.email)}</a></div>
  <form id="party-form" class="mt-8 max-w-md mx-auto form-aligned"><div class="nes-field"><label for="name_field">${escapeHtml(home.contact.nameLabel)}</label><input type="text" id="name_field" name="name" class="nes-input" placeholder="${escapeHtml(home.contact.namePlaceholder)}" autocomplete="name" maxlength="100" required></div><div class="nes-field mt-4"><label for="msg_field">${escapeHtml(home.contact.messageLabel)}</label><textarea id="msg_field" name="message" class="nes-textarea" placeholder="${escapeHtml(home.contact.messagePlaceholder)}" rows="5" maxlength="1000" required></textarea></div><button type="submit" class="nes-btn is-success mt-4 w-full" aria-describedby="party-form-note">${escapeHtml(home.contact.submit)}</button><p id="party-form-note" class="text-xs text-gray-400 mt-4 leading-6 text-center">${escapeHtml(home.contact.note)}</p></form>
 </div></section>
</main><footer class="text-center p-8 bg-black border-t-4 border-[#212529]"><p class="text-xs text-gray-400">${escapeHtml(home.footer)}</p><div class="mt-4"><i class="nes-icon is-small heart" aria-hidden="true"></i></div></footer>`;
}

function script(home) {
    const strings = serializeJsonForHtml({ terminal: home.terminal, contact: home.contact });
    return `<script>
const localized = ${strings};
const terminalOutput=document.getElementById('terminal-output'),terminalInput=document.getElementById('terminal-input');
terminalInput.addEventListener('keydown',function(event){if(event.key!=='Enter')return;const input=this.value.toLowerCase().trim();let response=localized.terminal.responses[input]||localized.terminal.unknownBefore+' '+input+'. '+localized.terminal.unknownAfter;const targets={about:'#about',skills:'#about',projects:'#projects',contact:'#contact'};if(targets[input])document.querySelector(targets[input]).scrollIntoView();if(input==='clear')terminalOutput.innerHTML='';else{addToTerminal(localized.terminal.prompt+' '+input);addToTerminal('> '+response)}this.value='';terminalOutput.scrollTop=terminalOutput.scrollHeight});
function addToTerminal(text){const p=document.createElement('p');p.innerText=text;p.dir='auto';terminalOutput.appendChild(p)}
const partyForm=document.getElementById('party-form'),playerNameField=document.getElementById('name_field'),messageField=document.getElementById('msg_field');
playerNameField.addEventListener('input',function(){this.setCustomValidity('')});messageField.addEventListener('input',function(){this.setCustomValidity('')});partyForm.addEventListener('submit',function(event){event.preventDefault();const playerName=playerNameField.value.trim(),message=messageField.value.trim();playerNameField.setCustomValidity(playerName?'':localized.contact.nameRequired);messageField.setCustomValidity(message?'':localized.contact.messageRequired);if(!partyForm.reportValidity())return;const subject=encodeURIComponent(localized.contact.emailSubject.replace('{name}',playerName));const body=encodeURIComponent(localized.contact.emailPlayer+': '+playerName+'\\n\\n'+message);window.location.href='mailto:MeghdadFadaee@gmail.com?subject='+subject+'&body='+body});
</script>`;
}

export function renderHomePage(template, site, locale, payload, cards) {
    return template.replace("{{HTML_LANG}}", escapeHtml(locale.code)).replace("{{HTML_DIR}}", escapeHtml(locale.direction))
        .replace("<!-- HOME_HEAD -->", head(site, locale, payload.home))
        .replace("<!-- HOME_SCHEMA -->", `    <script type="application/ld+json" id="profile-schema">\n${renderSchema(site, locale, payload.home)}\n    </script>`)
        .replace("<!-- HOME_BODY -->", body(site, locale, payload.home, cards))
        .replace("<!-- HOME_SCRIPT -->", script(payload.home));
}
