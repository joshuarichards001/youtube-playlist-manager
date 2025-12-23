import axios from "axios";

export const fetchUserAPI = async (
  accessToken: string
): Promise<User | null> => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return {
      name: result.data.given_name,
      picture: result.data.picture,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};
