const apiResponse = async (message, imageFile) => {
  const content = [
    {
      type: "text",
      text: message,
    },
  ];

  if (imageFile) {
    const base64Image = imageFile.buffer.toString("base64");

    content.push({
      type: "image_url",
      image_url: {
        url: `data:${imageFile.mimetype};base64,${base64Image}`,
      },
    });
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },

      body: JSON.stringify({
        model: imageFile
          ? "qwen/qwen3.8-27b"
          : "openai/gpt-oss-20b",

        messages: [
          {
            role: "user",
            content: imageFile ? content : message,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Could not get an AI response."
    );
  }

  const answer = data.choices?.[0]?.message?.content;

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("The AI returned an empty response.");
  }

  return answer;
};

export default apiResponse;