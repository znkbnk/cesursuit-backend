const express = require("express");
const router = express.Router();
const Enquiry = require("../models/Enquiry");
const Newsletter = require("../models/Newsletter");
const NewsletterCampaign = require("../models/NewsletterCampaignSchema");
const sgMail = require("@sendgrid/mail");

// Set SendGrid API key
if (!process.env.SENDGRID_API_KEY) {
  console.error("SENDGRID_API_KEY is not set in environment variables");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// POST new enquiry
router.post("/", async (req, res) => {
  try {
    const { suitId, name, email, phone, message } = req.body;
    const enquiry = new Enquiry({
      suitId,
      name,
      email,
      phone,
      message,
    });
    await enquiry.save();
    res.status(201).json({ message: "Enquiry submitted successfully" });
  } catch (error) {
    console.error("Enquiry submission error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST newsletter subscription
router.post("/newsletter", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    const existingSubscriber = await Newsletter.findOne({ email: normalizedEmail });
    if (existingSubscriber) {
      return res.status(400).json({ message: "This email is already subscribed" });
    }

    const subscriber = new Newsletter({ email: normalizedEmail });
    await subscriber.save();
    res.status(201).json({ message: "Subscribed successfully" });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "This email is already subscribed" });
    } else {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
});

// GET all newsletter subscribers
router.get("/newsletter/subscribers", async (req, res) => {
  try {
    const subscribers = await Newsletter.find().select("email subscribedAt");
    res.status(200).json(subscribers);
  } catch (error) {
    console.error("Fetch subscribers error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST create and send newsletter
router.post("/newsletter/campaign", async (req, res) => {
  try {
    const { subject, content } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ message: "Subject and content are required" });
    }

    // Sanitize inputs
    const sanitizedSubject = subject.trim();
    const sanitizedContent = content.trim();
    if (!sanitizedSubject || !sanitizedContent) {
      return res.status(400).json({ message: "Subject and content cannot be empty" });
    }

    // Fetch all subscribers
    const subscribers = await Newsletter.find().select("email");
    const recipientCount = subscribers.length;

    // Check if there are subscribers
    if (recipientCount === 0) {
      return res.status(400).json({ message: "No subscribers found" });
    }

    // Create newsletter campaign
    const campaign = new NewsletterCampaign({
      subject: sanitizedSubject,
      content: sanitizedContent,
      recipientCount,
    });

    // Send individual emails to each subscriber
    const emailPromises = subscribers.map((sub) => {
      const emailContent = {
        to: sub.email,
        from: "zenikibeniki@gmail.com",
        subject: sanitizedSubject,
        text: `
          ${sanitizedSubject}
          ${sanitizedContent}
          Explore Our Collections: https://cesursuits.netlify.app/collections
          Best regards,
          The Cesur Suits Team
          Unsubscribe: https://cesursuits.netlify.app/unsubscribe?email=${encodeURIComponent(sub.email)}
        `,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${sanitizedSubject}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>${sanitizedSubject}</h2>
            <p>${sanitizedContent}</p>
            <p><a href="https://cesursuits.netlify.app/collections" style="color: #007bff; text-decoration: none;">Explore Our Collections</a></p>
            <p>Best regards,<br/>The Cesur Suits Team</p>
            <p style="font-size: 0.9em; color: #666;">
              <a href="https://cesursuits.netlify.app/unsubscribe?email=${encodeURIComponent(sub.email)}" style="color: #007bff; text-decoration: none;">Unsubscribe</a>
            </p>
          </body>
          </html>
        `,
      };
      return sgMail.send(emailContent).catch((error) => ({
        email: sub.email,
        error: error.response?.body?.errors || error.message,
      }));
    });

    // Execute all email sends
    const results = await Promise.all(emailPromises);
    const errors = results.filter((result) => result && result.error);

    if (errors.length > 0) {
      campaign.status = "failed";
      campaign.error = `Failed to send to ${errors.length} subscribers: ${JSON.stringify(errors)}`;
      console.error("SendGrid email sending errors:", errors);
      await campaign.save();
      return res.status(500).json({
        message: `Failed to send newsletter to ${errors.length} subscribers`,
        errors,
      });
    }

    campaign.status = "sent";
    campaign.sentAt = new Date();
    console.log(`Newsletter sent to ${recipientCount} subscribers`);

    await campaign.save();
    res.status(201).json({ message: "Newsletter campaign created and sent", campaign });
  } catch (error) {
    console.error("Newsletter campaign error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET all newsletter campaigns
router.get("/newsletter/campaigns", async (req, res) => {
  try {
    const campaigns = await NewsletterCampaign.find().sort({ createdAt: -1 });
    res.status(200).json(campaigns);
  } catch (error) {
    console.error("Fetch campaigns error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST unsubscribe from newsletter
router.post("/newsletter/unsubscribe", async (req, res) => {
  try {
    console.log("Unsubscribe request received:", req.body);
    const { email } = req.body;
    if (!email) {
      console.log("Unsubscribe request failed: Email is required");
      return res.status(400).json({ message: "Email is required" });
    }

    // Normalize email to lowercase for case-insensitive matching
    const normalizedEmail = email.toLowerCase();
    console.log(`Attempting to unsubscribe email: ${normalizedEmail}`);

    // Check if email exists before deletion
    const subscriberExists = await Newsletter.findOne({ email: normalizedEmail });
    if (!subscriberExists) {
      console.log(`Email not found in subscribers: ${normalizedEmail}`);
      return res.status(404).json({ message: "Email not found in subscribers" });
    }

    const subscriber = await Newsletter.findOneAndDelete({ email: normalizedEmail });
    console.log(`Successfully unsubscribed email: ${normalizedEmail}`);

    // Send confirmation email
    const confirmationEmail = {
      to: normalizedEmail,
      from: "zenikibeniki@gmail.com",
      subject: "Unsubscribe Confirmation",
      text: `
        You have been unsubscribed from Cesur Suits newsletters.
        We're sorry to see you go! If you change your mind, you can resubscribe at https://cesursuits.netlify.app.
        Best regards,
        The Cesur Suits Team
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Unsubscribe Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Unsubscribe Confirmation</h2>
          <p>You have been unsubscribed from Cesur Suits newsletters.</p>
          <p>We're sorry to see you go! If you change your mind, you can <a href="https://cesursuits.netlify.app" style="color: #007bff; text-decoration: none;">resubscribe</a> at our website.</p>
          <p>Best regards,<br/>The Cesur Suits Team</p>
        </body>
        </html>
      `,
    };

    try {
      await sgMail.send(confirmationEmail);
      console.log(`Unsubscribe confirmation email sent to: ${normalizedEmail}`);
    } catch (emailError) {
      console.error("Failed to send unsubscribe confirmation email:", emailError.response?.body || emailError);
    }

    res.status(200).json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;