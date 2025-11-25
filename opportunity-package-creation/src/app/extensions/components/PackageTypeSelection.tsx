import React, { useState, useEffect } from "react";
import {
  hubspot,
  Text,
  Select,
  List,
  Button,
  Flex,
  LoadingSpinner,
} from "@hubspot/ui-extensions";

import { PackageTypeOption } from "../types/index";
import { ErrorScreen } from "./ErrorScreen";

interface PackageTypeSelectionProps {
  onNext: (packageType?: string) => void;
  onPackageTypeSelect: (packageType: string) => void;
}

export const PackageTypeSelection: React.FC<PackageTypeSelectionProps> = ({
  onNext,
  onPackageTypeSelect,
}) => {
  const [packageTypes, setPackageTypes] = useState<PackageTypeOption[]>([]);
  const [selectedPackageType, setSelectedPackageType] = useState<
    string | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackageTypes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await hubspot.serverless("getPackageTypes", {
        parameters: {},
      });
      console.log("Serverless function response:", response);
      setPackageTypes(response);
    } catch (err) {
      setError("Failed to load package types. Please try again.");
      console.error("Error fetching package types:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackageTypes();
  }, []);

  const handlePackageTypeChange = (value: string | number | undefined) => {
    const newValue = value as string;
    setSelectedPackageType(newValue);
    onPackageTypeSelect(newValue);
  };

  const handleNext = () => {
    onNext(selectedPackageType);
  };

  if (isLoading) {
    return (
      <Flex direction="column" justify="center" align="center" gap="md">
        <LoadingSpinner label="Loading package types..." />
      </Flex>
    );
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={fetchPackageTypes} />;
  }

  return (
    <Flex direction="column" gap="md">
      <Select
        options={packageTypes}
        value={selectedPackageType}
        onChange={handlePackageTypeChange}
        label="Type of Package"
      />
      <Flex direction="column" gap="flush">
        <Text>
          Please be aware the following fields will be copied from the Parent
          Opportunity:
        </Text>
        <List variant="unordered-styled">
          <>Owner</>
          <>Account Name</>
          <>Opportunity Type</>
          <>Close Date</>
          <>Stage</>
          <>Forecast Stage</>
          <>Probability</>
          <>Test Article Name</>
          <>Test Article Type</>
          <>ROA</>
          <>ROA Details</>
          <>Project Type 1</>
          <>Project Type 2</>
          <>Project Type 3</>
          <>Business Unit (DSA)</>
        </List>
      </Flex>
      <Flex direction="row" justify="end">
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!selectedPackageType}
        >
          Select Studies
        </Button>
      </Flex>
    </Flex>
  );
};
