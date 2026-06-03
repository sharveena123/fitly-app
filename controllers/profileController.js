
const authModule = require('./authController');

exports.getUserProfile = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ success: false, message: "User email parameter is required." });
    }

    // lookup user in active system collection memory
    const users = authModule.usersCollection || [];
    const user = users.find(u => u.email === email.toLowerCase());

    if (!user) {
      return res.status(404).json({ success: false, message: "Profile account records not found." });
    }

    // return profile fields without revealing encrypted password hash blocks
    return res.status(200).json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        age: user.age,
        weight: user.weight,
        height: user.height,
        goal: user.goal,
        gender: user.gender || "",
        activity: user.activity || "moderate",
        bmi: user.bmi || null,
        bmiLabel: user.bmiLabel || "-"
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Profile retrieval fault: " + error.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { email, name, age, gender, activity, weight, height, goal } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Authentication context missing email key." });
    }

    const users = authModule.usersCollection || [];
    const userIndex = users.findIndex(u => u.email === email.toLowerCase());

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: "User profile record target not found." });
    }

    // bmi calculation logic 
    let calculatedBmi = null;
    let computedLabel = "-";
    let labelColor = "#999999";

    if (weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      calculatedBmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
      const bmiNum = parseFloat(calculatedBmi);

      // logic evaluation rules matching medical standards
      if (bmiNum < 18.5) {
        computedLabel = "Underweight";
        labelColor = "#38bdf8";
      } else if (bmiNum >= 18.5 && bmiNum < 25) {
        computedLabel = "Normal Weight";
        labelColor = "#00aa55"; 
      } else if (bmiNum >= 25 && bmiNum < 30) {
        computedLabel = "Overweight";
        labelColor = "#ff9900"; 
      } else {
        computedLabel = "Obese";
        labelColor = "#cc0000"; 
      }
    }

    // merge modified data blocks directly into server runtime repository memory
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      age: parseInt(age) || users[userIndex].age,
      gender: gender || users[userIndex].gender || "",
      activity: activity || users[userIndex].activity || "moderate",
      weight: parseFloat(weight) || users[userIndex].weight,
      height: parseFloat(height) || users[userIndex].height,
      goal: goal || users[userIndex].goal,
      bmi: calculatedBmi,
      bmiLabel: `<span style="color:${labelColor}">${computedLabel}</span>`
    };

    return res.status(200).json({
      success: true,
      message: "Profile metrics calculated and updated successfully on backend server!",
      user: users[userIndex]
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Profile modification engine fault: " + error.message });
  }
};