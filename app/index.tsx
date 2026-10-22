import { Link } from "expo-router";
import { Button, View } from "react-native";

export default function MainScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Link href="/laps" asChild>
        <Button title="Laps history" />
      </Link>
    </View>
  );
}
