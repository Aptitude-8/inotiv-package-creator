import React, { useState, useMemo, useEffect } from "react";
import {
  Text,
  Button,
  Flex,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableHeader,
  Checkbox,
  hubspot,
  LoadingSpinner,
  LoadingButton,
} from "@hubspot/ui-extensions";
import { ErrorScreen } from "./ErrorScreen";

interface StudySelectionProps {
  onBack: () => void;
  onNext: (packageType?: string, result?: any) => void;
  selectedPackageType: string | undefined;
}

type SortDirection = "none" | "ascending" | "descending";

interface SortState {
  package_type: SortDirection;
  project_type_1_v2: SortDirection;
  project_type_2_v2: SortDirection;
  project_type_3_v2: SortDirection;
  species: SortDirection;
  lead_site: SortDirection;
  sort_order: SortDirection;
}

const DEFAULT_SORT_STATE: SortState = {
  package_type: "none",
  project_type_1_v2: "none",
  project_type_2_v2: "none",
  project_type_3_v2: "none",
  species: "none",
  lead_site: "none",
  sort_order: "none",
};

export const StudySelection: React.FC<StudySelectionProps> = ({
  onBack,
  onNext,
  selectedPackageType,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState(DEFAULT_SORT_STATE);
  const itemsPerPage = 10;

  const fetchPackages = async () => {
    if (!selectedPackageType) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await hubspot.serverless("getOppPackagesByType", {
        parameters: {
          packageType: String(selectedPackageType),
        },
      });
      setPackages(response);
    } catch (err) {
      setError("Failed to load packages. Please try again.");
      console.error("Error fetching packages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [selectedPackageType]);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId]
    );
  };

  const handleSort = (
    fieldName: keyof SortState,
    sortDirection: SortDirection
  ) => {
    const dataClone = [...packages];
    dataClone.sort((entry1, entry2) => {
      let value1 = entry1.properties[fieldName];
      let value2 = entry2.properties[fieldName];

      // Convert to numbers if we're sorting by sort_order
      if (fieldName === "sort_order") {
        value1 = Number(value1);
        value2 = Number(value2);
      }

      if (sortDirection === "ascending") {
        return value1 < value2 ? -1 : 1;
      }
      return value2 < value1 ? -1 : 1;
    });

    setSortState({ ...DEFAULT_SORT_STATE, [fieldName]: sortDirection });
    setPackages(dataClone);
  };

  // Calculate which packages are on the current page
  const currentPagePackages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return packages.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, packages]);

  // Check if all packages on current page are selected
  const areAllSelected = useMemo(() => {
    return currentPagePackages.every((pkg) =>
      selectedPackages.includes(pkg.id)
    );
  }, [currentPagePackages, selectedPackages]);

  // Handle select all for current page
  const handleSelectAll = () => {
    if (areAllSelected) {
      // If all are selected, deselect all on current page
      setSelectedPackages((prev) =>
        prev.filter((id) => !currentPagePackages.some((pkg) => pkg.id === id))
      );
    } else {
      // If not all are selected, select all on current page
      const newSelected = new Set([...selectedPackages]);
      currentPagePackages.forEach((pkg) => newSelected.add(pkg.id));
      setSelectedPackages(Array.from(newSelected));
    }
  };

  // Mapping function to transform opportunity package values to Deal property values
  const mapProjectTypeValue = (value: string): string => {
    // Map opportunity package values to Deal property values
    const mappings: { [key: string]: string } = {
      "Supporting  Inotiv in vivo_Bioanalysis":
        "Supporting  Inotiv in vivo (Bioanalysis)",
      "Supporting  Inotiv in vivo_Dose Formulation Analysis":
        "Supporting  Inotiv in vivo (Dose Formulation Analysis)",
      "Supporting  Inotiv in vivo_Histopathology":
        "In Support of Inotiv in vivo (Histopathology)",
      "Not Supporting Inotiv in vivo_Bioanalysis":
        "Not Supporting Inotiv in vivo (Bioanalysis)",
      "Not Supporting Inotiv in vivo_Dose Formulation Analysis":
        "Not Supporting Inotiv in vivo (Dose Formulation Analysis)",
      "Not Supporting Inotiv in vivo_Histopathology":
        "Not Supporting Inotiv in vivo (Histopathology)",
      // Add more mappings as needed
    };

    return mappings[value] || value; // Return mapped value or original if no mapping found
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      const selectedPackagesData = packages.filter((pkg) =>
        selectedPackages.includes(pkg.id)
      );

      // Extract the required properties from each selected package
      const selectedStudiesData = selectedPackagesData.map((pkg) => ({
        species__dsa_: pkg.properties.species,
        project_type_1: mapProjectTypeValue(
          pkg.properties.project_type_1_v2 || ""
        ),
        project_type_2: mapProjectTypeValue(
          pkg.properties.project_type_2_v2 || ""
        ),
        project_type_3: mapProjectTypeValue(
          pkg.properties.project_type_3_v2 || ""
        ),
        cpq_quote_name__dsa_opp_package_: pkg.properties.cpq_quote_title,
        inotiv_lead_site: pkg.properties.lead_site,
        main_study_duration__days_: pkg.properties.main_duration,
        recovery_duration__days_: pkg.properties.recovery_duration,
        opportunity_title: pkg.properties.opportunity_title,
      }));

      const result = await hubspot.serverless('createChildDeals', {
        parameters: { selectedStudies: selectedStudiesData },
        propertiesToSend: [
          'hs_object_id',
          'company_association',
          'primary_contact_association',
          'dealstage',
          'dealtype',
          'dealname',
          'probability',
          'forecast_stage__dsa_',
          'test_article_name__dsa_',
          'test_article_type__dsa_',
          'cx_team__dsa_',
          'cx_rep__dsa_',
          'regulatory_status__dsa_',
          'inotiv_lead_site',
          'hubspot_owner_id',
          'send_complaint_reporting__dsa_',
          'roa__dsa_',
          'roa_detail__dsa_',
          'opportunity_type__dsa_',
          'opportunity_type_2__dsa_',
        ],
      });
      console.log("result", result);
      onNext(undefined, result);
    } catch (error) {
      console.error("Error creating child deals:", error);
      setError("Failed to create child deals. Please try again.");
    } finally {
      setIsFinishing(false);
    }
  };

  if (isLoading) {
    return (
      <Flex direction="column" justify="center" align="center" gap="md">
        <LoadingSpinner label="Loading studies..." />
      </Flex>
    );
  }

  if (error) {
    return (
      <ErrorScreen error={error} onBack={onBack} onRetry={fetchPackages} />
    );
  }

  return (
    <Flex direction="column" gap="md">
      <Text>List of Studies</Text>
      <Flex gap="md">
        <Text>Total: {packages.length}</Text>
        <Text>Selected: {selectedPackages.length}</Text>
      </Flex>
      <Table
        paginated={true}
        page={currentPage}
        pageCount={Math.ceil(packages.length / itemsPerPage)}
        onPageChange={setCurrentPage}
      >
        <TableHead>
          <TableRow>
            <TableHeader width="min">
              <Checkbox checked={areAllSelected} onChange={handleSelectAll} />
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.package_type}
              onSortChange={(sortDirection) =>
                handleSort("package_type", sortDirection)
              }
            >
              Opportunity Type
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.project_type_1_v2}
              onSortChange={(sortDirection) =>
                handleSort("project_type_1_v2", sortDirection)
              }
            >
              Project Type 1
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.project_type_2_v2}
              onSortChange={(sortDirection) =>
                handleSort("project_type_2_v2", sortDirection)
              }
            >
              Project Type 2
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.project_type_3_v2}
              onSortChange={(sortDirection) =>
                handleSort("project_type_3_v2", sortDirection)
              }
            >
              Project Type 3
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.species}
              onSortChange={(sortDirection) =>
                handleSort("species", sortDirection)
              }
            >
              Species
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.lead_site}
              onSortChange={(sortDirection) =>
                handleSort("lead_site", sortDirection)
              }
            >
              Lead Site
            </TableHeader>
            <TableHeader
              width="min"
              sortDirection={sortState.sort_order}
              onSortChange={(sortDirection) =>
                handleSort("sort_order", sortDirection)
              }
            >
              Sort Order
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {currentPagePackages.map((pkg, index) => (
            <TableRow key={pkg.id || index}>
              <TableCell>
                <Checkbox
                  checked={selectedPackages.includes(pkg.id)}
                  onChange={() => handlePackageSelect(pkg.id)}
                />
              </TableCell>
              <TableCell>{pkg.properties.package_type}</TableCell>
              <TableCell>{pkg.properties.project_type_1_v2}</TableCell>
              <TableCell>{pkg.properties.project_type_2_v2}</TableCell>
              <TableCell>{pkg.properties.project_type_3_v2}</TableCell>
              <TableCell>{pkg.properties.species}</TableCell>
              <TableCell>{pkg.properties.lead_site}</TableCell>
              <TableCell>{pkg.properties.sort_order}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Flex gap="sm" justify="end">
        <Button variant="secondary" onClick={onBack}>
          Previous
        </Button>
        <LoadingButton
          variant="primary"
          onClick={handleFinish}
          disabled={selectedPackages.length === 0}
          loading={isFinishing}
        >
          Finish
        </LoadingButton>
      </Flex>
    </Flex>
  );
};
