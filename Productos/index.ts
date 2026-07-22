import {IInputs, IOutputs} from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.WebApi.Entity;

export class ProjectProductsManager implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _leftPanel: HTMLDivElement;
    private _rightPanel: HTMLDivElement;
    private _versionElement: HTMLDivElement;

    // Estado 
    private _selectedProductId: string | null = null;
    private _selectedProductEstimatedQty: number = 0;
    private _currentLines: any[] = [];
    private _productCounts: Record<string, number> = {};
    private _lastDatasetIds: string = "";
    
    private _currentBaseNameSuggestion: string = "";
    
    private readonly VERSION = "v0.0.10";

    // =======================================================================
    // NOMBRES LÓGICOS
    // =======================================================================
    private readonly LOGICAL_NAME_NOMBRE_PADRE = "sec_nombre"; 
    private readonly LOGICAL_NAME_NUMERO_PRODUCTO = "a_268d74c4a6744c079367357c0ab2686a.productnumber"; 
    private readonly LOGICAL_NAME_PRODUCTO_ASOCIADO_NOMBRE = "sec_productoid"; 
    private readonly LOGICAL_NAME_CANTIDAD_ESTIMADA = "sec_cantidadestimada"; 
    
    private readonly LOGICAL_NAME_LINEA_ENTIDAD = "sec_lineadeproductodeproyecto"; 
    private readonly LOGICAL_NAME_NOMBRE_HIJO = "sec_name"; 
    private readonly LOGICAL_NAME_NUMERO_SERIE = "sec_numerodeserie";
    private readonly LOGICAL_NAME_ESTADO_PRODUCTO = "sec_estadodelproducto";
    
    private readonly LOGICAL_NAME_LOOKUP_PRODUCTO = "sec_productodeproyectoid"; 
    private readonly LOGICAL_NAME_ENTIDAD_PADRE_PLURAL = "sec_productodeproyectos"; 
    // =======================================================================

    constructor() {}

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._context = context;
        this._container = container;

        this._container.className = "pcf-main-container";

        this._leftPanel = document.createElement("div");
        this._leftPanel.className = "pcf-left-panel";

        this._rightPanel = document.createElement("div");
        this._rightPanel.className = "pcf-right-panel";
        
        this._versionElement = document.createElement("div");
        this._versionElement.className = "pcf-version";
        this._versionElement.innerText = this.VERSION;

        this._container.appendChild(this._leftPanel);
        this._container.appendChild(this._rightPanel);
        this._container.appendChild(this._versionElement);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        const dataset = context.parameters.projectProductsDataset;

        if (dataset.loading) return;

        const currentIds = dataset.sortedRecordIds.join(",");
        
        if (currentIds !== this._lastDatasetIds && dataset.sortedRecordIds.length > 0) {
            this._lastDatasetIds = currentIds;
            this.fetchCounts(dataset);
        } else {
            this.renderLeftPanel(dataset);
        }
    }

    private fetchCounts(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        const ids = dataset.sortedRecordIds;
        const valuesXml = ids.map(id => `<value>${id}</value>`).join('');
        
        const fetchXml = `
        <fetch aggregate="true">
          <entity name="${this.LOGICAL_NAME_LINEA_ENTIDAD}">
            <attribute name="${this.LOGICAL_NAME_LOOKUP_PRODUCTO}" alias="productid" groupby="true" />
            <attribute name="${this.LOGICAL_NAME_LINEA_ENTIDAD}id" alias="count" aggregate="count" />
            <filter type="and">
              <condition attribute="${this.LOGICAL_NAME_LOOKUP_PRODUCTO}" operator="in">
                ${valuesXml}
              </condition>
              <condition attribute="statecode" operator="eq" value="0" />
            </filter>
          </entity>
        </fetch>`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, "?fetchXml=" + encodeURIComponent(fetchXml))
            .then(response => {
                const newCounts: Record<string, number> = {};
                ids.forEach(id => newCounts[id] = 0); 

                response.entities.forEach(entity => {
                    const productId = entity["productid"] || entity[`_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value`];
                    const count = entity["count"];
                    if (productId && count !== undefined) {
                        newCounts[productId] = parseInt(count, 10);
                    }
                });

                this._productCounts = newCounts;
                this.renderLeftPanel(dataset);
            })
            .catch(err => {
                console.error("Error al obtener conteos agregados", err);
                this.renderLeftPanel(dataset);
            });
    }

    private renderLeftPanel(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        this._leftPanel.innerHTML = ""; 

        const title = document.createElement("h3");
        title.className = "pcf-left-title";
        title.innerText = "Productos de Proyecto";
        this._leftPanel.appendChild(title);

        dataset.sortedRecordIds.forEach(recordId => {
            const record = dataset.records[recordId];

            const nombre = record.getFormattedValue(this.LOGICAL_NAME_NOMBRE_PADRE) || "Sin nombre";
            const numeroProducto = record.getFormattedValue(this.LOGICAL_NAME_NUMERO_PRODUCTO) || "--";
            const nombreAsociado = record.getFormattedValue(this.LOGICAL_NAME_PRODUCTO_ASOCIADO_NOMBRE) || "--";
            
            const cantidadEstimadaStr = record.getValue(this.LOGICAL_NAME_CANTIDAD_ESTIMADA);
            const cantidadEstimada = cantidadEstimadaStr ? parseInt(cantidadEstimadaStr as string, 10) : 0;
            const cantidadCreada = this._productCounts[recordId] !== undefined ? this._productCounts[recordId] : 0;

            const card = document.createElement("div");
            card.className = "pcf-card";
            
            if (this._selectedProductId === recordId) {
                card.classList.add("selected");
            }

            const cardTitle = document.createElement("div");
            cardTitle.className = "pcf-card-title";
            cardTitle.innerText = nombre;

            const cardQty = document.createElement("div");
            cardQty.className = "pcf-qty-badge";
            cardQty.innerText = `Líneas creadas: ${cantidadCreada} / Estimadas: ${cantidadEstimada}`;
            
            if (cantidadCreada < cantidadEstimada) {
                cardQty.classList.add("low");
            } else if (cantidadCreada === cantidadEstimada) {
                cardQty.classList.add("exact");
            } else {
                cardQty.classList.add("high");
            }

            const cardNum = document.createElement("div");
            cardNum.className = "pcf-card-num";
            cardNum.innerText = `${nombreAsociado} (#${numeroProducto})`;

            card.appendChild(cardTitle);
            card.appendChild(cardQty);
            card.appendChild(cardNum);

            card.onclick = () => {
                if (this._selectedProductId !== recordId) {
                    this._currentBaseNameSuggestion = ""; 
                }
                this._selectedProductId = recordId;
                this._selectedProductEstimatedQty = cantidadEstimada;
                this.renderLeftPanel(dataset); 
                this.loadRightPanel();
            };

            this._leftPanel.appendChild(card);
        });
    }

    private loadRightPanel(): void {
        this._rightPanel.innerHTML = "Cargando líneas...";

        if (!this._selectedProductId) {
            this._rightPanel.innerHTML = "Seleccione un producto para ver sus líneas.";
            return;
        }

        const query = `?$filter=_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value eq ${this._selectedProductId} and statecode eq 0`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, query).then(
            (response) => {
                this._currentLines = response.entities;
                this.renderRightPanel();
            },
            (error) => {
                console.error("Error al recuperar líneas", error);
                this._rightPanel.innerHTML = "Error al cargar las líneas.";
            }
        );
    }

    private renderRightPanel(): void {
        this._rightPanel.innerHTML = "";

        const title = document.createElement("h3");
        title.className = "pcf-right-title";
        title.innerText = "Líneas de Producto Asociadas";
        this._rightPanel.appendChild(title);

        const count = this._currentLines.length;
        const missing = this._selectedProductEstimatedQty - count;

        const controlsDiv = document.createElement("div");
        controlsDiv.className = "pcf-right-controls";

        if (missing > 0) {
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "pcf-input pcf-name-input";
            nameInput.placeholder = "Nombre base (ej. Cámara)";
            if (this._currentBaseNameSuggestion) {
                nameInput.value = this._currentBaseNameSuggestion;
            }
            controlsDiv.appendChild(nameInput);

            const btnsContainer = document.createElement("div");
            btnsContainer.className = "pcf-btns-container";

            const btnCreateOne = document.createElement("button");
            btnCreateOne.className = "pcf-btn pcf-btn-secondary";
            btnCreateOne.innerText = "Crear línea (1)";
            btnCreateOne.onclick = () => this.createLines(nameInput.value, 1);
            btnsContainer.appendChild(btnCreateOne);

            const btnCreateAll = document.createElement("button");
            btnCreateAll.className = "pcf-btn pcf-btn-primary";
            btnCreateAll.innerText = `Crear faltantes (${missing})`;
            btnCreateAll.onclick = () => this.createLines(nameInput.value, missing);
            btnsContainer.appendChild(btnCreateAll);

            controlsDiv.appendChild(btnsContainer);
        } else {
            const successMsg = document.createElement("span");
            successMsg.className = "pcf-success-msg";
            successMsg.innerText = "✓ Cantidad estimada alcanzada";
            controlsDiv.appendChild(successMsg);
        }

        this._rightPanel.appendChild(controlsDiv);

        // Cabecera de la tabla de líneas (Visible solo si hay líneas)
        if (this._currentLines.length > 0) {
            const headerRow = document.createElement("div");
            headerRow.className = "pcf-lines-header";

            const hNum = document.createElement("span");
            hNum.innerText = "#";
            
            const hName = document.createElement("span");
            hName.innerText = "Línea de producto";
            
            const hState = document.createElement("span");
            hState.innerText = "Estado";
            
            const hSerial = document.createElement("span");
            hSerial.innerText = "Nº Serie";

            headerRow.appendChild(hNum);
            headerRow.appendChild(hName);
            headerRow.appendChild(hState);
            headerRow.appendChild(hSerial);
            this._rightPanel.appendChild(headerRow);
        }

        const list = document.createElement("ul");
        list.className = "pcf-lines-list";

        this._currentLines.forEach((linea, index) => {
            const li = document.createElement("li");
            li.className = "pcf-line-item";

            // 0. Columna Numérica (Orden)
            const numSpan = document.createElement("span");
            numSpan.className = "pcf-line-num";
            numSpan.innerText = (index + 1).toString();

            // 1. Campo Nombre Editable
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "pcf-input pcf-line-name-input";
            nameInput.value = linea[this.LOGICAL_NAME_NOMBRE_HIJO] || "";
            nameInput.placeholder = "Nombre";

            nameInput.onblur = () => {
                const newVal = nameInput.value.trim();
                const oldVal = linea[this.LOGICAL_NAME_NOMBRE_HIJO] || "";
                if (newVal !== oldVal) {
                    nameInput.classList.add("saving");
                    const data = { [this.LOGICAL_NAME_NOMBRE_HIJO]: newVal };
                    this._context.webAPI.updateRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, linea[this.LOGICAL_NAME_LINEA_ENTIDAD + "id"], data)
                        .then(() => {
                            nameInput.classList.remove("saving");
                            nameInput.classList.add("saved");
                            linea[this.LOGICAL_NAME_NOMBRE_HIJO] = newVal; 
                            setTimeout(() => nameInput.classList.remove("saved"), 1500);
                        })
                        .catch(e => {
                            nameInput.classList.remove("saving");
                            nameInput.classList.add("error");
                            console.error("Error actualizando Nombre", e);
                        });
                }
            };

            // 2. Insignia de Estado 
            const estadoSpan = document.createElement("span");
            estadoSpan.className = "pcf-estado-badge";
            const estadoLabel = linea[`${this.LOGICAL_NAME_ESTADO_PRODUCTO}@OData.Community.Display.V1.FormattedValue`] || linea[this.LOGICAL_NAME_ESTADO_PRODUCTO] || "Sin estado";
            estadoSpan.innerText = estadoLabel;
            
            let hash = 0;
            for (let i = 0; i < estadoLabel.length; i++) {
                hash = estadoLabel.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash % 360);
            estadoSpan.style.backgroundColor = `hsl(${hue}, 70%, 90%)`;
            estadoSpan.style.color = `hsl(${hue}, 80%, 30%)`;

            // 3. Campo Número de Serie Editable
            const serialInput = document.createElement("input");
            serialInput.type = "text";
            serialInput.className = "pcf-input pcf-serial-input";
            serialInput.placeholder = "Nº Serie";
            serialInput.value = linea[this.LOGICAL_NAME_NUMERO_SERIE] || "";
            
            serialInput.onblur = () => {
                const newVal = serialInput.value.trim();
                const oldVal = linea[this.LOGICAL_NAME_NUMERO_SERIE] || "";
                if (newVal !== oldVal) {
                    serialInput.classList.add("saving");
                    const data = { [this.LOGICAL_NAME_NUMERO_SERIE]: newVal };
                    this._context.webAPI.updateRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, linea[this.LOGICAL_NAME_LINEA_ENTIDAD + "id"], data)
                        .then(() => {
                            serialInput.classList.remove("saving");
                            serialInput.classList.add("saved");
                            linea[this.LOGICAL_NAME_NUMERO_SERIE] = newVal; 
                            setTimeout(() => serialInput.classList.remove("saved"), 1500);
                        })
                        .catch(e => {
                            serialInput.classList.remove("saving");
                            serialInput.classList.add("error");
                            console.error("Error actualizando Nº serie", e);
                        });
                }
            };

            li.appendChild(numSpan);
            li.appendChild(nameInput);
            li.appendChild(estadoSpan);
            li.appendChild(serialInput);
            list.appendChild(li);
        });

        this._rightPanel.appendChild(list);
    }

    private createLines(baseText: string, countToCreate: number): void {
        if (!this._selectedProductId || countToCreate <= 0) return;

        if (!baseText || baseText.trim() === "") {
            alert("Por favor, complete el Nombre base para poder crear líneas.");
            return;
        }

        let baseName = baseText.trim();
        let prefix = baseName;
        
        const match = baseName.match(/^(.*?)(\s*\d+)$/);
        if (match) {
            prefix = match[1].trim();
        }

        let maxNum = 0;
        
        this._currentLines.forEach(l => {
            const n = l[this.LOGICAL_NAME_NOMBRE_HIJO] || "";
            if (n === prefix) {
                maxNum = Math.max(maxNum, 1);
            } else if (n.startsWith(prefix + " ")) {
                const numPart = n.substring(prefix.length + 1);
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed)) {
                    maxNum = Math.max(maxNum, parsed);
                }
            } else if (n === baseName && match) {
                maxNum = Math.max(maxNum, parseInt(match[2].trim(), 10));
            }
        });

        let currentNum = 1;
        if (maxNum > 0) {
            currentNum = maxNum + 1;
        } else if (match) {
            currentNum = parseInt(match[2].trim(), 10);
        }

        const promises = [];

        for (let i = 0; i < countToCreate; i++) {
            const data: any = {};
            data[`${this.LOGICAL_NAME_LOOKUP_PRODUCTO}@odata.bind`] = `/${this.LOGICAL_NAME_ENTIDAD_PADRE_PLURAL}(${this._selectedProductId})`;
            data[this.LOGICAL_NAME_NOMBRE_HIJO] = `${prefix} ${currentNum}`;
            promises.push(this._context.webAPI.createRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, data));
            currentNum++;
        }

        Promise.all(promises).then(() => {
            this._currentBaseNameSuggestion = `${prefix} ${currentNum}`;
            this.loadRightPanel();
            
            const dataset = this._context.parameters.projectProductsDataset;
            this.fetchCounts(dataset); 
            
        }).catch(error => {
            console.error("Error al crear líneas", error);
            alert("Error al crear líneas. Revisa la consola.");
        });
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
    }
}