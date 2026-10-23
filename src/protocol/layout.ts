/** The struct differences between Games that the shared packet readers need. */
export interface GameLayout {
  /** cs_maxNumCarsInUDPData */
  numCars: number;
  /** CarTelemetryData.m_engineTemperature */
  engineTemperature: "uint8" | "uint16";
  /** CarStatusData.m_ersHarvestLimitPerLap, inserted before m_ersDeployedThisLap. */
  ersHarvestLimitPerLap: boolean;
  /** Active aero and DRS zones plus extra assists appended to PacketSessionData. */
  sessionAeroZones: boolean;
  /** ParticipantData.m_teamId */
  participantTeamId: "uint8" | "uint16";
}
