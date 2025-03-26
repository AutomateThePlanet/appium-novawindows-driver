import { pwsh } from '../powershell';

export const FIND_CHILDREN_RECURSIVELY = pwsh /* ps1 */ `
    function Find-ChildrenRecursively {
        param (
            [Parameter(Mandatory=$true)]
            [AutomationElement]$element,
            [Parameter(Mandatory=$true)]
            [Condition]$condition,
            [Parameter(Mandatory=$false)]
            [bool]$includeSelf = $false
        )

        $scope = if ($includeSelf) {
            [TreeScope]::Element -bor [TreeScope]::Children
        } else {
            [TreeScope]::Children
        }

        $validChild = $element.FindFirst($scope, $condition)

        if ($validChild -ne $null) {
            return $validChild
        }

        $children = $element.FindAll([TreeScope]::Children, [Condition]::TrueCondition)
        foreach ($child in $children) {
            $result = Find-AllChildrenRecursively -element $child -condition $condition -returnFirstResult $true
            if ($result -ne $null) {
                return $result[0]
            }
        }

        return $null
    }

    function Find-AllChildrenRecursively {
        param (
            [Parameter(Mandatory=$true)]
            [AutomationElement]$element,
            [Parameter(Mandatory=$true)]
            [Condition]$condition,
            [bool]$returnFirstResult = $false,
            [Parameter(Mandatory=$false)]
            [bool]$includeSelf = $false
        )

        $children = $element.FindAll([TreeScope]::Children, [Condition]::TrueCondition)
        $validChildren = @($children | Where-Object { $_.FindFirst([TreeScope]::Element, $condition) -ne $null })

        if ($includeSelf) {
            $self = $element.FindFirst([TreeScope]::Element, $condition)
        }

        if ($null -ne $self) {
            $validChildren += $self
        }

        foreach ($child in $children) {
            $Allresults = Find-AllChildrenRecursively -element $child -condition $condition
            if ($returnFirstResult -and $Allresults.Count -gt 0) {
                return $Allresults
            }

            foreach ($result in $Allresults) {
                $validChildren += ($result | Where-Object { $_.FindFirst([TreeScope]::Element, $condition) -ne $null })
            }
        }

        return $validChildren
    }
`;

export const PAGE_SOURCE = pwsh /* ps1 */ `
    function Get-PageSource {
        param (
            [Parameter(Mandatory = $true)]
            [AutomationElement]$element,
            [Xml.XmlDocument]$xmlDoc,
            [Xml.XmlElement]$xmlElement
        )

        try {
            $localizedControlType = $element.GetCurrentPropertyValue([AutomationElement]::LocalizedControlTypeProperty)
            $controlType = $element.GetCurrentPropertyValue([AutomationElement]::ControlTypeProperty)

            $tagName = ''
            try {
                $tagName = $controlType.ProgrammaticName.Split('.')[-1]
            } catch {
                # fallback to LocalizedControlType ControlType is empty
                $tagName = -join ($localizedControlType -split ' ' | ForEach-Object {
                    $_.Substring(0, 1).ToUpper() + $_.Substring(1).ToLower()
                })
            }

            $acceleratorKey = $element.GetCurrentPropertyValue([AutomationElement]::AcceleratorKeyProperty)
            $accessKey = $element.GetCurrentPropertyValue([AutomationElement]::AccessKeyProperty)
            $automationId = $element.GetCurrentPropertyValue([AutomationElement]::AutomationIdProperty)
            $className = $element.GetCurrentPropertyValue([AutomationElement]::ClassNameProperty)
            $frameworkId = $element.GetCurrentPropertyValue([AutomationElement]::FrameworkIdProperty)
            $hasKeyboardfocus = $element.GetCurrentPropertyValue([AutomationElement]::HasKeyboardfocusProperty)
            $helpText = $element.GetCurrentPropertyValue([AutomationElement]::HelpTextProperty)
            $isContentelement = $element.GetCurrentPropertyValue([AutomationElement]::IsContentelementProperty)
            $isControlelement = $element.GetCurrentPropertyValue([AutomationElement]::IsControlelementProperty)
            $isEnabled = $element.GetCurrentPropertyValue([AutomationElement]::IsEnabledProperty)
            $isKeyboardfocusable = $element.GetCurrentPropertyValue([AutomationElement]::IsKeyboardfocusableProperty)
            $isOffscreen = $element.GetCurrentPropertyValue([AutomationElement]::IsOffscreenProperty)
            $isPassword = $element.GetCurrentPropertyValue([AutomationElement]::IsPasswordProperty)
            $isRequiredforform = $element.GetCurrentPropertyValue([AutomationElement]::IsRequiredforformProperty)
            $itemStatus = $element.GetCurrentPropertyValue([AutomationElement]::ItemStatusProperty)
            $itemType = $element.GetCurrentPropertyValue([AutomationElement]::ItemTypeProperty)
            $name = $element.GetCurrentPropertyValue([AutomationElement]::NameProperty)
            $orientation = $element.GetCurrentPropertyValue([AutomationElement]::OrientationProperty)
            $processId = $element.GetCurrentPropertyValue([AutomationElement]::ProcessIdProperty)
            $runtimeId = $element.GetCurrentPropertyValue([AutomationElement]::RuntimeIdProperty) -join '.'
            $boundingRectangle = $element.Current.BoundingRectangle
            $x = $boundingRectangle.X - $rootElement.Current.BoundingRectangle.X
            $y = $boundingRectangle.Y - $rootElement.Current.BoundingRectangle.Y
            $width = $boundingRectangle.Width
            $height = $boundingRectangle.Height

            if ($null -eq $xmlDoc) { $xmlDoc = [Xml.XmlDocument]::new() }

            $newXmlElement = $xmlDoc.CreateElement($tagName)
            $newXmlElement.SetAttribute("AcceleratorKey", $acceleratorKey)
            $newXmlElement.SetAttribute("AccessKey", $accessKey)
            $newXmlElement.SetAttribute("AutomationId", $automationId)
            $newXmlElement.SetAttribute("ClassName", $className)
            $newXmlElement.SetAttribute("FrameworkId", $frameworkId)
            $newXmlElement.SetAttribute("HasKeyboardfocus", $hasKeyboardfocus)
            $newXmlElement.SetAttribute("HelpText", $helpText)
            $newXmlElement.SetAttribute("IsContentelement", $isContentelement)
            $newXmlElement.SetAttribute("IsControlelement", $isControlelement)
            $newXmlElement.SetAttribute("IsEnabled", $isEnabled)
            $newXmlElement.SetAttribute("IsKeyboardfocusable", $isKeyboardfocusable)
            $newXmlElement.SetAttribute("IsOffscreen", $isOffscreen)
            $newXmlElement.SetAttribute("IsPassword", $isPassword)
            $newXmlElement.SetAttribute("IsRequiredforform", $isRequiredforform)
            $newXmlElement.SetAttribute("ItemStatus", $itemStatus)
            $newXmlElement.SetAttribute("ItemType", $itemType)
            $newXmlElement.SetAttribute("LocalizedControlType", $localizedControlType)
            $newXmlElement.SetAttribute("Name", $name)
            $newXmlElement.SetAttribute("Orientation", $orientation)
            $newXmlElement.SetAttribute("ProcessId", $processId)
            $newXmlElement.SetAttribute("RuntimeId", $runtimeId)
            $newXmlElement.SetAttribute("x", $x)
            $newXmlElement.SetAttribute("y", $y)
            $newXmlElement.SetAttribute("width", $width)
            $newXmlElement.SetAttribute("height", $height)

            $pattern = $null

            if ($element.TryGetCurrentPattern([WindowPattern]::Pattern, [ref]$pattern)) {
                $newXmlElement.SetAttribute("CanMaximize", $windowPattern.Current.CanMaximize)
                $newXmlElement.SetAttribute("CanMinimize", $windowPattern.Current.CanMinimize)
                $newXmlElement.SetAttribute("IsModal", $windowPattern.Current.IsModal)
                $newXmlElement.SetAttribute("WindowVisualState", $windowPattern.Current.WindowVisualState)
                $newXmlElement.SetAttribute("WindowInteractionState", $windowPattern.Current.WindowInteractionState)
                $newXmlElement.SetAttribute("IsTopmost", $windowPattern.Current.IsTopmost)
            }

            if ($element.TryGetCurrentPattern([TransformPattern]::Pattern, [ref]$pattern)) {
                $newXmlElement.SetAttribute("CanRotate", $windowPattern.Current.CanRotate)
                $newXmlElement.SetAttribute("CanResize", $windowPattern.Current.CanResize)
                $newXmlElement.SetAttribute("CanMove", $windowPattern.Current.CanMove)
            }

            # TODO: more to be added depending on the available patterns

            if ($null -eq $xmlElement) {
                $xmlElement = $xmlDoc.AppendChild($newXmlElement)
            } else {
                $xmlElement = $xmlElement.AppendChild($newXmlElement)
            }

            $elementsToProcess = New-Object System.Collections.Queue
            $element.FindAll([TreeScope]::Children, $cacheRequest.TreeFilter) | ForEach-Object {
                $elementsToProcess.Enqueue($_)
            }

            while ($elementsToProcess.Count -gt 0) {
                $currentElement = $elementsToProcess.Dequeue()
                Get-PageSource $currentElement $xmlDoc $xmlElement | Out-Null
            }
        } catch {
            # noop
        }

        return $xmlElement
    }
`;