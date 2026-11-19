import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOMServer from "react-dom/server";
import FormDescriptionRenderer, { isSafeUrl } from "./FormDescriptionRenderer.jsx";

function renderToHtml(content) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(FormDescriptionRenderer, { content })
  );
}

test("Scenario 1: Preserve a newline after a link", () => {
  const input = "https://computerclub.mist.ac.bd/contest_reminders\nTeam formation begins next week.";
  const html = renderToHtml(input);

  // Verifies the URL is a usable link
  assert.match(
    html,
    /<a\s+href="https:\/\/computerclub\.mist\.ac\.bd\/contest_reminders"[^>]*>https:\/\/computerclub\.mist\.ac\.bd\/contest_reminders<\/a>/
  );

  // Verifies a break tag immediately separates the link and the next sentence
  assert.match(html, /<\/a><br\/>\s*Team formation begins next week\./);

  // Verifies safe target and rel attributes
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("Scenario 2: Preview supported formatting (bold, italic, links, lists, code)", () => {
  const input = [
    "Welcome to **TFC 2027** registration! *Deadline: Dec 15.*",
    "",
    "Contest reminders: https://computerclub.mist.ac.bd/contest_reminders",
    "Team formation begins next week.",
    "",
    "- First checklist item",
    "- Second item with [Official Rules](https://example.com/rules)",
    "",
    "1. Register online",
    "2. Check email for confirmation",
    "",
    "Reference code: `TFC-2027-OK`",
  ].join("\n");

  const html = renderToHtml(input);

  // Bold
  assert.match(html, /<strong[^>]*>TFC 2027<\/strong>/);
  // Italic
  assert.match(html, /<em[^>]*>Deadline: Dec 15\.<\/em>/);
  // Autolink
  assert.match(html, /<a href="https:\/\/computerclub\.mist\.ac\.bd\/contest_reminders"/);
  // Markdown link
  assert.match(html, /<a href="https:\/\/example\.com\/rules"[^>]*>Official Rules<\/a>/);
  // Unordered list
  assert.match(html, /<ul[^>]*>[\s\S]*?<li[^>]*>First checklist item<\/li>[\s\S]*?<\/ul>/);
  // Ordered list
  assert.match(html, /<ol[^>]*>[\s\S]*?<li[^>]*>Register online<\/li>[\s\S]*?<\/ol>/);
  // Inline code
  assert.match(html, /<code[^>]*>TFC-2027-OK<\/code>/);
});

test("Scenario 3: Read an existing plain-text description without modification", () => {
  const singleParagraph = "Gear Up for 2027 contest registration. Please register before Friday.";
  const html1 = renderToHtml(singleParagraph);
  assert.match(html1, /<p[^>]*>Gear Up for 2027 contest registration\. Please register before Friday\.<\/p>/);

  const multilineText = "Line 1 of instructions.\nLine 2 with details.\nLine 3 with deadlines.";
  const html2 = renderToHtml(multilineText);
  assert.match(html2, /Line 1 of instructions\.<br\/>\s*Line 2 with details\.<br\/>\s*Line 3 with deadlines\./);
});

test("Scenario 4 Outline: Prevent executable description content (XSS protection)", () => {
  // <script>alert(1)</script>
  const scriptInput = "<script>alert(1)</script>";
  const scriptHtml = renderToHtml(scriptInput);
  assert.doesNotMatch(scriptHtml, /<script[^>]*>/i);
  assert.match(scriptHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

  // <img src=x onerror=alert(1)>
  const imgInput = "<img src=x onerror=alert(1)>";
  const imgHtml = renderToHtml(imgInput);
  assert.doesNotMatch(imgHtml, /<img[^>]*>/i);
  assert.match(scriptHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(imgHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);

  // [Open](javascript:alert(1))
  const jsLinkInput = "[Open](javascript:alert(1))";
  const jsLinkHtml = renderToHtml(jsLinkInput);
  assert.doesNotMatch(jsLinkHtml, /href="javascript:/i);
  // Rendered as inert span
  assert.match(jsLinkHtml, /<span[^>]*>Open<\/span>/);

  // data: URL
  const dataLinkInput = "[Payload](data:text/html,<script>alert(1)</script>)";
  const dataLinkHtml = renderToHtml(dataLinkInput);
  assert.doesNotMatch(dataLinkHtml, /href="data:/i);
  assert.match(dataLinkHtml, /<span[^>]*>Payload<\/span>/);

  // vbscript: URL
  const vbLinkInput = "[VBS](vbscript:msgbox(1))";
  const vbLinkHtml = renderToHtml(vbLinkInput);
  assert.doesNotMatch(vbLinkHtml, /href="vbscript:/i);
  assert.match(vbLinkHtml, /<span[^>]*>VBS<\/span>/);

  // file: URL
  const fileLinkInput = "[Local file](file:///etc/passwd)";
  const fileLinkHtml = renderToHtml(fileLinkInput);
  assert.doesNotMatch(fileLinkHtml, /href="file:/i);
  assert.match(fileLinkHtml, /<span[^>]*>Local file<\/span>/);
});

test("Scenario 5: Long URL wraps with break-all to avoid horizontal overflow on 390px screens", () => {
  const longUrl = "https://computerclub.mist.ac.bd/very/long/deep/url/path/with/lots/of/characters/that/exceeds/narrow/viewport/widths/and/must/wrap/cleanly";
  const html = renderToHtml(longUrl);
  assert.match(html, /class="[^"]*break-all[^"]*"/);
});

test("isSafeUrl helper validation", () => {
  assert.equal(isSafeUrl("https://example.com"), true);
  assert.equal(isSafeUrl("http://example.com"), true);
  assert.equal(isSafeUrl("mailto:admin@mist.ac.bd"), true);
  assert.equal(isSafeUrl("/relative/path"), true);
  assert.equal(isSafeUrl("#anchor"), true);

  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("data:text/html,test"), false);
  assert.equal(isSafeUrl("vbscript:test"), false);
  assert.equal(isSafeUrl("file:///test"), false);
  assert.equal(isSafeUrl(""), false);
  assert.equal(isSafeUrl(null), false);
});
